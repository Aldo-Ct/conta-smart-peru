"use client";
import { useEffect, useRef, useState } from 'react';

export default function DocumentLookup({onFound,onChange}:{onFound:(name:string)=>void;onChange:(document:string)=>void}) {
  const [value,setValue]=useState('');
  const [status,setStatus]=useState('');
  const onFoundRef=useRef(onFound);
  onFoundRef.current=onFound;
  useEffect(()=>{
    if(value.length!==8 && value.length!==11){setStatus('');return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setStatus('Consultando documento…');
      try {
        const response=await fetch('/api/documento?numero='+encodeURIComponent(value),{signal:controller.signal});
        const data=await response.json();
        if(!response.ok) throw new Error(data.error || 'No se pudo realizar la consulta.');
        onFoundRef.current(data.name);
        setStatus('Nombre encontrado. Puede corregirlo si es necesario.');
      } catch(error) {
        if(!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Error de consulta.');
      }
    },600);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[value]);
  return <label>DNI o RUC<input autoFocus autoComplete="off" inputMode="numeric" maxLength={11} value={value} placeholder="8 dígitos (DNI) o 11 (RUC)" onChange={e=>{const next=e.target.value.replace(/\D/g,'').slice(0,11);setValue(next);onChange(next)}}/><small aria-live="polite">{status || 'La búsqueda se inicia al completar el número.'}</small></label>;
}
