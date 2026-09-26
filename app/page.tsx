import { redirect } from 'next/navigation';
import { configured } from '@/lib/supabase/server';
import { requireAdmin,HttpError } from '@/lib/auth';
import LeagueApp from './league-app';
export const dynamic='force-dynamic';
export default async function Home(){
 if(!configured())return <main className="loading"><span className="brand-mark">S</span><h1>League setup</h1><p>Connect the app to its Supabase project before signing in.</p><p>The deployment guide lists the five required settings.</p></main>;
 let allowed=false;
 try{await requireAdmin();allowed=true;}catch(error){if(!(error instanceof HttpError))throw error;if(error.status===403)redirect('/login?access=denied');if(error.status!==401)throw error;}
 if(!allowed)redirect('/login');
 return <LeagueApp/>;
}
