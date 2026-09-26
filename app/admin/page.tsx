import {redirect} from 'next/navigation';
import {requireAdmin,HttpError} from '@/lib/auth';
import AdminPanel from './panel';
export const dynamic='force-dynamic';
export default async function Admin(){try{await requireAdmin(true);}catch(e){if(e instanceof HttpError&&(e.status===401||e.status===403))redirect('/');throw e;}return <AdminPanel/>;}
