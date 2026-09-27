import test from 'node:test';
import assert from 'node:assert/strict';
import {rankLeaderboard,relativeToPar} from '../lib/leaderboard.ts';
test('leaderboard ranks net scores with competition ties',()=>{
 const rows=rankLeaderboard([
  {playerId:'a',name:'Amy',gross:90,playingHandicap:18,net:72},
  {playerId:'b',name:'Bea',gross:88,playingHandicap:16,net:72},
  {playerId:'c',name:'Cam',gross:90,playingHandicap:17,net:73},
 ]);
 assert.deepEqual(rows.map(row=>[row.name,row.rank,row.tied]),[['Bea',1,true],['Amy',1,true],['Cam',3,false]]);
 assert.equal(relativeToPar(72,72),'E');assert.equal(relativeToPar(70,72),'-2');assert.equal(relativeToPar(75,72),'+3');
});
