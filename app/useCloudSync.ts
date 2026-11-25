'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {decideSync,decideLiveSync} from '../lib/cloud-sync.mjs';
import {readAccountData} from '../lib/local-account.mjs';

type SyncStatus='checking'|'signedOut'|'synced'|'saving'|'offline'|'conflict'|'invalid';
function stable(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
async function hashSnapshot(value:string):Promise<string|undefined>{
 if(!globalThis.crypto?.subtle)return undefined;
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function useCloudSync<T>(data:T,ready:boolean,setData:(value:T)=>void,storageKey:string){
 const hadLocal=useRef<boolean|null>(null);if(hadLocal.current===null && typeof window!=='undefined')hadLocal.current=readAccountData(localStorage,storageKey.slice('conta-smart-v2:'.length))!==null;
 const [status,setStatus]=useState<SyncStatus>('checking'),[error,setError]=useState('');const statusRef=useRef(status);statusRef.current=status;
 const revision=useRef<number|null>(null),identity=useRef(''),last=useRef(''),latest=useRef(data),inflight=useRef(false),connecting=useRef(false),polling=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),active=useRef(false),setDataRef=useRef(setData);
 latest.current=data;setDataRef.current=setData;
 const flush=useCallback(async()=>{
  if(!active.current||revision.current===null||inflight.current)return;
  const payload=latest.current, fingerprint=stable(payload);if(fingerprint===last.current)return;
  inflight.current=true;setStatus('saving');
  try{
   const res=await fetch('/api/conta/data',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:revision.current,data:payload})});
   if(res.status===401){active.current=false;setStatus('signedOut');return;}
   if(res.status===409){active.current=false;setStatus('conflict');return;}
   if(res.status===400){const body=await res.json().catch(()=>({}));setError(body.error||'Los datos no son válidos.');active.current=false;setStatus('invalid');return;}
   if(!res.ok){active.current=false;setStatus('offline');return;}
   const body=await res.json();revision.current=body.revision;last.current=fingerprint;setError('');
   const fingerprintHash=await hashSnapshot(fingerprint);localStorage.setItem('conta-smart-cloud-revision',JSON.stringify({username:identity.current,revision:body.revision,fingerprintHash}));setStatus('synced');
  }catch{active.current=false;setStatus('offline');}finally{inflight.current=false;}
  if(active.current&&stable(latest.current)!==last.current)void flush();
 },[]);
 const connect=useCallback(async()=>{
  if(!ready||inflight.current||connecting.current)return;
  connecting.current=true;active.current=false;setStatus('checking');
  try{
   const session=await fetch('/api/conta/session',{credentials:'same-origin',cache:'no-store'});
   if(session.status===401){setStatus('signedOut');return;}if(!session.ok)throw new Error('session');
   const user=(await session.json()).user;identity.current=user.username;if(user.role==='viewer'){setStatus('signedOut');return;}
   const response=await fetch('/api/conta/data',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('data');
   const cloud=(await response.json()).snapshot;
   if(!cloud){revision.current=0;last.current='';active.current=true;void flush();return;}
   const cloudFingerprint=stable(cloud.data),localFingerprint=stable(latest.current);
   let knownRevision=0,knownHash:string|undefined;try{const marker=JSON.parse(localStorage.getItem('conta-smart-cloud-revision')||'null');if(marker?.username===user.username){knownRevision=Number(marker.revision)||0;knownHash=marker.fingerprintHash;}}catch{}
   const localHash=knownHash?await hashSnapshot(localFingerprint):undefined;
   if(stable(latest.current)!==localFingerprint){setStatus('conflict');return;}
   const decision=decideSync({hasLocal:hadLocal.current===true,localFingerprint,cloudFingerprint,knownRevision,cloudRevision:cloud.revision,localMatchesKnown:!!knownHash&&localHash===knownHash});
   if(decision==='load-cloud'){setDataRef.current(cloud.data as T);latest.current=cloud.data as T;hadLocal.current=true;}
   else if(decision==='conflict'){setStatus('conflict');return;}
   revision.current=cloud.revision;last.current=cloudFingerprint;const fingerprintHash=await hashSnapshot(cloudFingerprint);localStorage.setItem('conta-smart-cloud-revision',JSON.stringify({username:user.username,revision:cloud.revision,fingerprintHash}));active.current=true;setStatus('synced');
   if(stable(latest.current)!==last.current)void flush();
  }catch{setStatus('offline');}finally{connecting.current=false;}
 },[ready,flush]);
 const pollCloud=useCallback(async()=>{
  if(!ready||!active.current||inflight.current||polling.current||revision.current===null)return;
  if(stable(latest.current)!==last.current)return;
  polling.current=true;
  try{
   const response=await fetch('/api/conta/data',{credentials:'same-origin',cache:'no-store'});
   if(response.status===401){active.current=false;setStatus('signedOut');return;}
   if(!response.ok)throw new Error('data');
   const cloud=(await response.json()).snapshot;
   if(!cloud||!active.current||inflight.current||revision.current===null)return;
   if(decideLiveSync({knownRevision:revision.current,cloudRevision:cloud.revision,localFingerprint:stable(latest.current),confirmedFingerprint:last.current})!=='load-cloud')return;
   const cloudFingerprint=stable(cloud.data),fingerprintHash=await hashSnapshot(cloudFingerprint);
   if(!active.current||inflight.current||revision.current===null||decideLiveSync({knownRevision:revision.current,cloudRevision:cloud.revision,localFingerprint:stable(latest.current),confirmedFingerprint:last.current})!=='load-cloud')return;
   revision.current=cloud.revision;last.current=cloudFingerprint;latest.current=cloud.data as T;hadLocal.current=true;
   localStorage.setItem('conta-smart-cloud-revision',JSON.stringify({username:identity.current,revision:cloud.revision,fingerprintHash}));setDataRef.current(cloud.data as T);setStatus('synced');
  }catch{if(active.current){active.current=false;setStatus('offline');}}finally{polling.current=false;}
 },[ready]);
 useEffect(()=>{if(!ready)return;void connect();const onSession=()=>void connect();window.addEventListener('conta-session-changed',onSession);window.addEventListener('online',onSession);const retry=setInterval(()=>{if(statusRef.current==='offline')void connect();else if(statusRef.current==='synced')void pollCloud()},5000);return()=>{active.current=false;window.removeEventListener('conta-session-changed',onSession);window.removeEventListener('online',onSession);clearInterval(retry);if(timer.current)clearTimeout(timer.current);};},[ready,connect,pollCloud]);
 useEffect(()=>{if(ready&&statusRef.current==='invalid'){void connect();return;}if(!ready||!active.current)return;if(timer.current)clearTimeout(timer.current);if(stable(latest.current)!==last.current)setStatus('saving');timer.current=setTimeout(()=>void flush(),700);return()=>{if(timer.current)clearTimeout(timer.current);};},[data,ready,flush,connect]);
 return {status,error,reconnect:connect};
}
