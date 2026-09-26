import { requireAdmin,requireOrigin,failure,HttpError } from '@/lib/auth';
import { z } from 'zod';
export const dynamic='force-dynamic';
export async function GET(){try{const {service}=await requireAdmin(true);const {data,error}=await service.from('league_admins').select('user_id,email,role,active,created_at').order('created_at');if(error)throw error;return Response.json({admins:data},{headers:{'Cache-Control':'no-store'}});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 requireOrigin(request);const {user,service}=await requireAdmin(true);
 const parsed=z.object({email:z.string().trim().email().max(254)}).safeParse(await request.json());if(!parsed.success)throw new HttpError(400,'Enter a valid email address.');
 const email=parsed.data.email.toLowerCase();if(email===user.email?.toLowerCase())throw new HttpError(400,'You already have owner access.');
 const found=await service.from('league_admins').select('user_id,active').eq('email',email).maybeSingle();if(found.error)throw found.error;
 if(found.data){if(found.data.active)throw new HttpError(409,'This administrator already has access.');const result=await service.from('league_admins').update({active:true}).eq('user_id',found.data.user_id).eq('role','admin');if(result.error)throw result.error;return Response.json({message:'Administrator access restored. They can use their existing login.'});}
 const {data,error}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:`${process.env.APP_URL}/account`});
 if(error||!data.user)throw new HttpError(400,'The invitation could not be sent. Check the email address and your Supabase email settings.');
 const added=await service.from('league_admins').insert({user_id:data.user.id,email,role:'admin',active:true,invited_by:user.id});
 if(added.error)throw new HttpError(503,'The invitation was sent but access could not be recorded. Contact the app owner to repair this account in Supabase before it is used.');
 return Response.json({message:'Invitation sent. The administrator can set a password using the email link.'});
}catch(error){return failure(error);}}
export async function PATCH(request:Request){try{
 requireOrigin(request);const {service}=await requireAdmin(true);
 const parsed=z.object({userId:z.string().uuid()}).safeParse(await request.json());if(!parsed.success)throw new HttpError(400,'Invalid administrator.');
 const {data,error}=await service.from('league_admins').update({active:false}).eq('user_id',parsed.data.userId).eq('role','admin').select('user_id');
 if(error)throw error;if(!data?.length)throw new HttpError(400,'Owner access cannot be removed here.');
 return Response.json({message:'Administrator access removed. Future requests are blocked.'});
}catch(error){return failure(error);}}
