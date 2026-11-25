'use client';
import {useEffect,useState} from 'react';

type Status='checking'|'signedOut'|'synced'|'saving'|'offline'|'conflict'|'invalid';
export default function CloudBackup({snapshot,restore,status,error,reconnect}:{snapshot:unknown;restore:(data:unknown)=>void;status:Status;error:string;reconnect:()=>Promise<void>}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[restoring,setRestoring]=useState(false);
 useEffect(()=>{if(restoring){setRestoring(false);void reconnect();}},[snapshot,restoring,reconnect]);
 async function load(){
  if(!confirm('Esto reemplazará los datos de este navegador con la copia de Azure. Descarga primero una copia si deseas conservar los cambios locales.'))return;
  setBusy(true);setMessage('');
  try{const res=await fetch('/api/conta/data',{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw new Error('No se pudo consultar Azure.');const body=await res.json();if(!body.snapshot)throw new Error('No hay datos guardados en Azure.');restore(body.snapshot.data);setRestoring(true);setMessage('Se recuperaron los datos de Azure.');}catch(e){setMessage(e instanceof Error?e.message:'No se pudo recuperar la copia.');}finally{setBusy(false)}
 }
 async function logout(){setBusy(true);try{const res=await fetch('/api/conta/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});if(!res.ok)throw new Error();window.dispatchEvent(new Event('conta-session-changed'));}catch{setMessage('No se pudo cerrar la sesión.');setBusy(false)}}
 const text=status==='synced'?'Todos los cambios están guardados en Azure.':status==='saving'?'Guardando cambios en Azure…':status==='checking'?'Comprobando la conexión con Azure…':status==='conflict'?'Hay diferencias entre este navegador y Azure. Recupera la copia de Azure o conserva primero una copia local.':status==='invalid'?`No se pudieron guardar los datos: ${error}`:status==='signedOut'?'Inicia sesión para sincronizar los datos.':'Sin conexión con Azure. Los cambios permanecen en este navegador y se intentará sincronizarlos automáticamente.';
 return <section className="card" style={{padding:20,marginBottom:20}}><h2>Guardado automático en Azure</h2><p>Los cambios se guardan automáticamente en Azure mientras trabajas.</p><p role="status"><strong>{text}</strong></p><p>Usuario: admin</p>{status==='offline'&&<button disabled={busy} onClick={()=>void reconnect()}>Reintentar conexión</button>}<details><summary>Recuperar datos de Azure</summary><p>Recupera la última copia guardada en Azure en este navegador.</p><button disabled={busy} onClick={()=>void load()}>Recuperar copia de Azure</button></details><button disabled={busy} onClick={()=>void logout()}>Cerrar sesión</button>{message&&<p role="status">{message}</p>}</section>;
}
