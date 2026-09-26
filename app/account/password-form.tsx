'use client';
import {useState} from 'react';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function PasswordForm({email}:{email:string}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="auth-screen"><section className="panel auth-card"><span className="brand-mark">S</span><h1>Set your password</h1><p>{email}</p><form className="edit-form" onSubmit={async e=>{e.preventDefault();if(password!==confirm){setError('Passwords do not match.');return;}setBusy(true);try{const {error}=await browserClient().auth.updateUser({password});if(error)throw error;location.assign('/');}catch(e){setError(e instanceof Error?e.message:'Could not save password.');}finally{setBusy(false);}}}><label>New password<Input type="password" minLength={12} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Repeat password<Input type="password" minLength={12} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><p className="microcopy">Use at least 12 characters.</p><Button disabled={busy}>Save password</Button>{error&&<p role="alert">{error}</p>}</form><a href="/">Back to league</a></section></main>;
}
