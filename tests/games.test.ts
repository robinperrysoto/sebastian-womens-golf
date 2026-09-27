import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLeague,type League,type Participant,type Round} from '../lib/league.ts';
import {rankGameResults,scoreRound,stablefordPoints} from '../lib/games.ts';

const player=(id:string,holes:number[],ph=0):Participant=>({playerId:id,index:0,courseHandicap:ph,playingHandicap:ph,gross:holes.reduce((a,b)=>a+b,0),holes});
const round=(id:string,p:Participant,type:NonNullable<Round['game']>['type'],extra:Partial<NonNullable<Round['game']>>={}):Round=>({id,season:'2026',date:'2026-01-01',firstTime:'08:00',interval:10,attendees:[p.playerId],groups:[{id:'g',playerIds:[p.playerId],locked:false}],participants:[p],status:'completed',game:{type,...extra}});
const league=(rounds:Round[]):League=>({...initialLeague,players:[],rounds});

test('Stableford uses net score and only selected counting holes',()=>{
 const holes=[...initialLeague.course.par];
 holes[0]--;// net birdie = 3 points
 holes[1]++;// net bogey = 1 point
 const r=round('a',player('p',holes),'stableford',{countingHoles:[0,1]});
 const result=scoreRound(league([r]),r)[0];
 assert.equal(result.points,4);
 assert.equal(result.net,initialLeague.course.par[0]+initialLeague.course.par[1]);
 assert.equal(stablefordPoints(9,4),0);
});

test('selected holes total only their net scores',()=>{
 const holes=initialLeague.course.par.map(x=>x+1),r=round('a',player('p',holes),'selected-holes',{countingHoles:[0,4,9]});
 const result=scoreRound(league([r]),r)[0];
 assert.equal(result.toPar,3);
 assert.equal(result.detail,'3 holes');
});

test('3-3-3 takes the best three net-to-par holes for each par',()=>{
 const holes=initialLeague.course.par.map((par,h)=>par+(h%4));
 const r=round('a',player('p',holes),'three-three-three'),result=scoreRound(league([r]),r)[0];
 assert.equal(result.detail.startsWith('Holes '),true);
 assert.equal(result.detail.split(',').length,9);
});

test('linked rounds support aggregate and best score hole by hole',()=>{
 const pars=[...initialLeague.course.par];
 const first=round('first',player('p',pars.map((x,h)=>x+(h%2))),'individual-net');
 const aggregate=round('aggregate',player('p',pars.map(x=>x+1)),'two-round-aggregate',{linkedRoundId:'first'});
 const best=round('best',player('p',pars.map(x=>x+1)),'two-round-best-hole',{linkedRoundId:'first'});
 const state=league([first,aggregate,best]);
 assert.equal(scoreRound(state,aggregate)[0].net,pars.reduce((a,b)=>a+b,0)*2+27);
 assert.equal(scoreRound(state,best)[0].net,pars.reduce((a,b)=>a+b,0)+9);
});

test('Stableford ranks highest points first with competition ties',()=>{
 const base={gross:72,playingHandicap:0,net:72,points:36,toPar:0,detail:'18 holes'};
 const r=round('a',player('p',initialLeague.course.par),'stableford');
 const ranked=rankGameResults([{...base,playerId:'a',name:'A',score:36},{...base,playerId:'b',name:'B',score:40},{...base,playerId:'c',name:'C',score:36}],r);
 assert.deepEqual(ranked.map(x=>[x.playerId,x.rank,x.tied]),[['b',1,false],['a',2,true],['c',2,true]]);
});
