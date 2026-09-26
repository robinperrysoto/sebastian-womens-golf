import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { canBootstrapOwner,originAllowed,isOwner } from '../lib/access.ts';
test('owner requires verified exact email; mutations require same origin',()=>{
 assert.equal(canBootstrapOwner('owner@example.com','confirmed','OWNER@example.com'),true);
 assert.equal(canBootstrapOwner('owner@example.com',undefined,'owner@example.com'),false);
 assert.equal(canBootstrapOwner('other@example.com','confirmed','owner@example.com'),false);
 assert.equal(isOwner('admin'),false);
 assert.equal(originAllowed('https://league.example','https://league.example'),true);
 for(const origin of [null,'https://league.example.evil.com','http://league.example','null']) assert.equal(originAllowed(origin,'https://league.example'),false);
});
test('database enforces access, stale saves and owner-only empty import',async()=>{
 const db=new PGlite();
 try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);');
 await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 const owner='00000000-0000-0000-0000-000000000001',admin='00000000-0000-0000-0000-000000000002',revoked='00000000-0000-0000-0000-000000000003';
 for(const id of [owner,admin,revoked])await db.query('insert into auth.users values($1)',[id]);
 await db.query("insert into league_admins(user_id,email,role,active) values($1,'owner@example.com','owner',true),($2,'admin@example.com','admin',true),($3,'revoked@example.com','admin',false)",[owner,admin,revoked]);
 await db.exec(`insert into league_state values(1,'{"players":[],"rounds":[]}',1,null,now()); set role service_role;`);
 const save=async(actor:string,version:number,imp=false,data={players:[] as unknown[],rounds:[]})=>(await db.query<{v:number|null}>('select save_league($1,$2,$3,$4) as v',[actor,version,JSON.stringify(data),imp])).rows[0].v;
 await assert.rejects(save(revoked,1),/Administrator access required/);
 await assert.rejects(save(admin,1,true),/Owner access required/);
 assert.equal(await save(owner,1,true,{players:[{id:'p1'}],rounds:[]}),2);
 assert.equal(await save(admin,1),null);
 assert.equal(await save(owner,2,true),null);
 assert.equal(await save(admin,2),3);
 const audit=await db.query<{n:number}>('select count(*)::int as n from league_changes');assert.equal(audit.rows[0].n,2);
 for(const role of ['anon','authenticated']){
 await db.exec('reset role; set role '+role);
 await assert.rejects(db.query('select * from league_state'),/permission denied/);
 await assert.rejects(save(owner,3),/permission denied/);
 }
 }finally{await db.close();}
});
