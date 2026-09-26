import { GET as loadLeague } from '../league/route';
import { createScorecardsPdf } from '@/lib/scorecards';
import type { League } from '@/lib/league';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const loaded=await loadLeague();
  if(!loaded.ok)return loaded;
  const {league}=await loaded.json() as {league:League};
  const url=new URL(request.url);
  const round=league.rounds.find(r=>r.id===url.searchParams.get('round'));
  if(!round?.groups.length)return new Response('This round has no scorecards yet. Go back and generate pairings first.',{status:404});
  try {
    const bytes=await createScorecardsPdf(league,round);
    const filename=`Sebastian-Scorecards-${round.date.replace(/[^0-9-]/g,'')}.pdf`;
    return new Response(bytes.slice().buffer as ArrayBuffer,{headers:{
      'Content-Type':'application/pdf',
      'Content-Disposition':`${url.searchParams.get('download')==='1'?'attachment':'inline'}; filename="${filename}"`,
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
    }});
  }catch(error){console.error('Scorecards PDF failed',error);return new Response('The scorecards could not be prepared. Please go back and try again.',{status:500});}
}
