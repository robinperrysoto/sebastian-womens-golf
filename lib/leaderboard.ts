export type LeaderboardEntry={playerId:string;name:string;gross:number;playingHandicap:number;net:number;rank:number;tied:boolean};

export function rankLeaderboard(rows:Omit<LeaderboardEntry,'rank'|'tied'>[]):LeaderboardEntry[]{
 const sorted=[...rows].sort((a,b)=>a.net-b.net||a.gross-b.gross||a.name.localeCompare(b.name));
 return sorted.map((row,index)=>{
  const rank=sorted.findIndex(other=>other.net===row.net)+1;
  return {...row,rank,tied:sorted.filter(other=>other.net===row.net).length>1};
 });
}

export function relativeToPar(score:number,par:number){const difference=score-par;return difference===0?'E':difference>0?`+${difference}`:`${difference}`;}
