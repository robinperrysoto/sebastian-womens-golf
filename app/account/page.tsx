import {redirect} from 'next/navigation';
import {sessionClient} from '@/lib/supabase/server';
import PasswordForm from './password-form';
export const dynamic='force-dynamic';
export default async function Account(){const client=await sessionClient();const {data:{user}}=await client.auth.getUser();if(!user)redirect('/login');return <PasswordForm email={user.email??''}/>;}
