import { initialLeague } from '@/lib/league';
import { requireAdmin,requireOrigin,failure,HttpError } from '@/lib/auth';
import { updateSchema } from '@/lib/validation';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){try{
 const {service}=await requireAdmin();
 const created=await service.from('league_state').upsert({id:1,data:initialLeague,version:1},{onConflict:'id',ignoreDuplicates:true});
 if(created.error)throw created.error;
 const {data,error}=await service.from('league_state').select('data,version').eq('id',1).single();
 if(error)throw error;
 return Response.json({league:data.data,version:data.version},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return failure(error);}}
export async function PUT(request:Request){try{
 requireOrigin(request);const {user,service}=await requireAdmin();
 const raw=await request.text();if(raw.length>2_000_000)throw new HttpError(413,'League data is too large.');
 const parsed=updateSchema.safeParse(JSON.parse(raw));if(!parsed.success)throw new HttpError(400,'Check the player, course and scoring values before saving.');
 const {data,error}=await service.rpc('save_league',{p_actor:user.id,p_version:parsed.data.version,p_data:parsed.data.league,p_import:false});
 if(error)throw error;
 if(data===null)throw new HttpError(409,'Another administrator saved changes. Reload the league before trying again. Your current inputs are still shown.');
 return Response.json({version:data},{headers:{'Cache-Control':'no-store'}});
}catch(error){return failure(error);}}
