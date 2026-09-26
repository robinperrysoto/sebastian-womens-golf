import { GET as readLeague } from '../league/route';
export const dynamic='force-dynamic';
export async function GET(){const res=await readLeague();if(!res.ok)return res;const body=await res.text();return new Response(body,{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="sebastian-league-backup.json"','Cache-Control':'private, no-store'}});}
