'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
const SessionContext=createContext<{username:string;role:string}|null>(null);
export const useSession=()=>useContext(SessionContext);

type State='checking'|'login'|'ready'|'unavailable';
export default function LoginGate({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<{username:string;role:string}|null>(null);
 const [state,setState]=useState<State>('checking'),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const check=useCallback(async()=>{try{const response=await fetch('/api/conta/session',{credentials:'same-origin',cache:'no-store'});if(response.status===401){setState('login');return;}if(!response.ok)throw new Error();const data=await response.json();if(!data.user?.username)throw new Error();setSession(data.user);setState('ready')}catch{setState('unavailable')}},[]);
 useEffect(()=>{void check();const changed=()=>void check();window.addEventListener('conta-session-changed',changed);return()=>window.removeEventListener('conta-session-changed',changed)},[check]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const response=await fetch('/api/conta/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})});const body=await response.json();if(!response.ok)throw new Error(body.error||'No se pudo iniciar sesión.');setPassword('');await check()}catch(error){setMessage(error instanceof Error?error.message:'No se pudo iniciar sesión.')}finally{setBusy(false)}}
 if(state==='ready'&&session)return <SessionContext.Provider key={session.username} value={session}>{children}</SessionContext.Provider>;
 if(state==='checking')return <div className="login-screen"><div className="login-card"><p>Comprobando acceso…</p></div></div>;
 if(state==='unavailable')return <div className="login-screen"><div className="login-card"><h1>CONTA <span>SMART</span> PERÚ</h1><p>No se pudo conectar con el servicio de acceso. Tus datos guardados en este navegador no se han borrado.</p><button className="primary" onClick={()=>{setState('checking');void check()}}>Reintentar</button></div></div>;
 return <div className="login-screen"><form className="login-card" onSubmit={login}><h1>CONTA <span>SMART</span> PERÚ</h1><h2>Iniciar sesión</h2><p>Usuario: <strong>admin</strong></p><label>Contraseña<input autoFocus type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{message&&<p role="alert">{message}</p>}<button className="primary" type="submit" disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form></div>;
}
