import 'server-only';
import { sessionClient, serviceClient } from './supabase/server';
import { canBootstrapOwner, originAllowed, type AdminRole } from './access';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function requireAdmin(ownerOnly=false){
 const auth=await sessionClient();const {data:{user},error}=await auth.auth.getUser();
 if(error||!user)throw new HttpError(401,'Please sign in.');
 const service=serviceClient();
 let result=await service.from('league_admins').select('user_id,email,role,active').eq('user_id',user.id).maybeSingle();
 if(result.error)throw new HttpError(503,'Administrator access could not be checked.');
 if(!result.data&&canBootstrapOwner(user.email,user.email_confirmed_at,process.env.OWNER_EMAIL)){
   const {error:insertError}=await service.from('league_admins').insert({user_id:user.id,email:user.email!.toLowerCase(),role:'owner',active:true});
   if(insertError&&insertError.code!=='23505')throw new HttpError(503,'Owner setup failed.');
   result=await service.from('league_admins').select('user_id,email,role,active').eq('user_id',user.id).maybeSingle();
 }
 if(result.error||!result.data?.active)throw new HttpError(403,'Your account does not have administrator access. Contact the league owner.');
 if(ownerOnly&&result.data.role!=='owner')throw new HttpError(403,'Only the league owner can do this.');
 return {user,role:result.data.role as AdminRole,service};
}
export function requireOrigin(request:Request){if(!originAllowed(request.headers.get('origin'),process.env.APP_URL))throw new HttpError(403,'Open the app at its configured address to save changes.');}
export function failure(error:unknown){if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});console.error(error);return Response.json({error:'The request could not be completed. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
