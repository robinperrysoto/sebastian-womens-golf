import {NextResponse} from 'next/server';
import {sessionClient} from '@/lib/supabase/server';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,token=params.get('token_hash'),type=params.get('type');
 const origin=process.env.APP_URL;
 if(!origin)return new Response('App address is not configured.',{status:503});
 if(token&&(type==='invite'||type==='recovery'||type==='email')){
  const client=await sessionClient();const {error}=await client.auth.verifyOtp({token_hash:token,type});
  if(!error)return NextResponse.redirect(new URL('/account',origin));
 }
 return NextResponse.redirect(new URL('/login?link=expired',origin));
}
