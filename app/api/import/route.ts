import { requireAdmin,requireOrigin,failure,HttpError } from '@/lib/auth';
import { leagueSchema } from '@/lib/validation';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireOrigin(request);const {user,service}=await requireAdmin(true);
 const raw=await request.text();if(raw.length>2_000_000)throw new HttpError(413,'The backup is too large.');
 const body=JSON.parse(raw);const parsed=leagueSchema.safeParse(body.league??body);if(!parsed.success)throw new HttpError(400,'This is not a complete league backup. Export the full JSON file from the original app.');
 const {data:current,error:readError}=await service.from('league_state').select('version').eq('id',1).single();if(readError)throw readError;
 const {data,error}=await service.rpc('save_league',{p_actor:user.id,p_version:current.version,p_data:parsed.data,p_import:true});
 if(error)throw error;if(data===null)throw new HttpError(409,'Import is allowed only into an empty league. No existing records were replaced.');
 return Response.json({message:'League imported.',players:parsed.data.players.length,rounds:parsed.data.rounds.length});
}catch(error){return failure(error);}}
