"use client";
import { useMemo, useState } from 'react';
import { validateEntry, validateOpening } from '../lib/accounting.mjs';

export type Line={account:string;name:string;debit:number;credit:number};
export type Entry={id:string;date:string;type:string;memo:string;lines:Line[]};
export type Account={code:string;name:string;nature:string;official:boolean};
const format=(x:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(x);
const dateString=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function OpeningBalance({accounts,entries,save}:{accounts:Account[];entries:Entry[];save:(entry:Entry)=>void}) {
  const [date,setDate]=useState(dateString());
  const [rows,setRows]=useState<Line[]>([{account:'10',name:'Efectivo y equivalentes de efectivo',debit:0,credit:0},{account:'50',name:'Capital',debit:0,credit:0}]);
  const [error,setError]=useState('');
  const total=useMemo(()=>rows.reduce((a,x)=>({debit:a.debit+Math.round(x.debit*100),credit:a.credit+Math.round(x.credit*100)}),{debit:0,credit:0}),[rows]);
  const update=(index:number,change:Partial<Line>)=>setRows(old=>old.map((row,i)=>i===index?{...row,...change}:row));
  const submit=()=>{
    try {
      const active=rows.filter(x=>x.debit!==0||x.credit!==0);
      const entry:Entry={id:`APE-${crypto.randomUUID()}`,date,type:'Apertura',memo:'Asiento de apertura',lines:active};
      validateOpening(entry,entries); save(entry); setError('Asiento de apertura registrado.');
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo registrar.');}
  };
  return <><div className="title"><div><h1>Balance inicial</h1><p>Registre saldos de apertura. Los importes deben cuadrar antes de contabilizar.</p></div></div><div className="card"><div className="form"><label>Fecha de apertura<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="tablewrap"><table><thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th><th></th></tr></thead><tbody>{rows.map((row,i)=><tr key={i}><td><select aria-label={`Cuenta ${i+1}`} value={row.account} onChange={e=>{const a=accounts.find(a=>a.code===e.target.value);if(a)update(i,{account:a.code,name:a.name})}}>{accounts.filter(a=>['1','2','3','4','5'].includes(a.code[0])).map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></td><td><input aria-label={`Debe ${i+1}`} type="number" min="0" step="0.01" value={row.debit} onChange={e=>update(i,{debit:Number(e.target.value)})}/></td><td><input aria-label={`Haber ${i+1}`} type="number" min="0" step="0.01" value={row.credit} onChange={e=>update(i,{credit:Number(e.target.value)})}/></td><td><button onClick={()=>setRows(old=>old.filter((_,j)=>i!==j))}>Quitar</button></td></tr>)}</tbody></table></div><p>Debe: <b>{format(total.debit/100)}</b> · Haber: <b>{format(total.credit/100)}</b> · Diferencia: <b>{format((total.debit-total.credit)/100)}</b></p><div className="modalactions"><button onClick={()=>setRows(old=>[...old,{account:'10',name:'Efectivo y equivalentes de efectivo',debit:0,credit:0}])}>Añadir fila</button><button className="primary" onClick={submit}>Registrar apertura</button></div>{error&&<p role="status">{error}</p>}<p className="hint">La apertura solo registra el asiento contable; no crea existencias ni cuentas bancarias. No utilice esta versión para contabilidad real.</p></div></>;
}

export function GeneralLedger({entries}:{entries:Entry[]}) {
  const codes=useMemo(()=>[...new Set(entries.flatMap(e=>e.lines.map(l=>l.account)))].sort(),[entries]);
  const [selected,setSelected]=useState('');
  const account=selected || codes[0] || '';
  const movements=entries.flatMap(e=>e.lines.filter(l=>l.account===account).map((l,i)=>({entry:e,line:l,key:e.id+'-'+i}))).sort((a,b)=>a.entry.date.localeCompare(b.entry.date)||a.entry.id.localeCompare(b.entry.id));
  let balance=0;
  return <><div className="title"><div><h1>Libro Mayor</h1><p>Movimientos y saldo acumulado por cuenta.</p></div></div><div className="card"><div className="form"><label>Cuenta<select value={account} onChange={e=>setSelected(e.target.value)}>{codes.map(c=><option key={c} value={c}>{c} · {entries.flatMap(e=>e.lines).find(l=>l.account===c)?.name}</option>)}</select></label></div><div className="tablewrap"><table><thead><tr><th>Fecha</th><th>Asiento</th><th>Glosa</th><th>Debe</th><th>Haber</th><th>Saldo deudor / acreedor</th></tr></thead><tbody>{movements.map(({entry,line,key})=>{balance+=Math.round(line.debit*100)-Math.round(line.credit*100);return <tr key={key}><td>{entry.date.split('-').reverse().join('/')}</td><td>{entry.id}</td><td>{entry.memo}</td><td>{format(line.debit)}</td><td>{format(line.credit)}</td><td>{format(Math.abs(balance)/100)} {balance<0?'A':'D'}</td></tr>})}{!movements.length&&<tr><td colSpan={6} className="empty">Sin movimientos contabilizados.</td></tr>}</tbody></table></div></div></>;
}

export function CashCount({entries}:{entries:Entry[]}) {
  const denominations=[200,100,50,20,10,5,2,1,0.5,0.2,0.1];
  const [counts,setCounts]=useState<number[]>(denominations.map(()=>0));
  const [responsible,setResponsible]=useState(''),[notes,setNotes]=useState('');
  const physical=counts.reduce((a,c,i)=>a+Math.round(denominations[i]*100)*c,0)/100;
  const book=entries.flatMap(e=>e.lines).filter(l=>l.account==='10'||l.account.startsWith('101')).reduce((a,l)=>a+Math.round(l.debit*100)-Math.round(l.credit*100),0)/100;
  return <><div className="title"><div><h1>Arqueo de caja</h1><p>Compare el recuento físico con el saldo registrado en las cuentas seleccionadas.</p></div><button className="primary" onClick={()=>window.print()}>Imprimir acta</button></div><div className="card"><div className="form"><label>Responsable<input value={responsible} onChange={e=>setResponsible(e.target.value)}/></label><label>Observaciones<input value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><table><thead><tr><th>Denominación</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>{denominations.map((d,i)=><tr key={d}><td>{format(d)}</td><td><input aria-label={`Cantidad ${d}`} type="number" min="0" step="1" value={counts[i]} onChange={e=>{const value=Math.max(0,Math.floor(Number(e.target.value)||0));setCounts(old=>old.map((x,j)=>i===j?value:x))}}/></td><td>{format(d*counts[i])}</td></tr>)}</tbody></table><p>Efectivo físico: <b>{format(physical)}</b> · Saldo de cuentas 10/101: <b>{format(book)}</b> · Diferencia: <b>{format(physical-book)}</b></p><p className="hint">Este recuento no se guarda ni genera ajustes. La cuenta 10 puede incluir bancos; revise la composición antes de interpretar la diferencia.</p></div></>;
}

export function LocalBackup({snapshot,restore}:{snapshot:unknown;restore:(data:unknown)=>void}) {
  const [message,setMessage]=useState('');
  const download=()=>{
    const blob=new Blob([JSON.stringify({format:'conta-smart-backup',version:1,createdAt:new Date().toISOString(),data:snapshot},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=`conta-smart-respaldo-${dateString()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const load=async(file:File)=>{
    try {
      if(file.size>5*1024*1024) throw new Error('El archivo supera el límite de 5 MB.');
      const backup=JSON.parse(await file.text());
      const d=backup?.data;
      if(backup?.format!=='conta-smart-backup'||backup?.version!==1||!d||!d.company||typeof d.company.name!=='string'||typeof d.company.ruc!=='string'||!Number.isFinite(d.company.igv)||!Array.isArray(d.accounts)||!Array.isArray(d.products)||!Array.isArray(d.docs)||!Array.isArray(d.entries)||typeof d.dark!=='boolean') throw new Error('El archivo no tiene el formato de respaldo esperado.');
      if(d.entries.some((e:Entry)=>!e||!Array.isArray(e.lines)||typeof e.id!=='string'||typeof e.date!=='string'||typeof e.type!=='string'||typeof e.memo!=='string')) throw new Error('El archivo contiene asientos inválidos.');
      if(d.entries.some((e:Entry)=>{try{validateEntry(e);return false}catch{return true}})) throw new Error('El respaldo contiene asientos inválidos o descuadrados; no se ha restaurado.');
      if(!confirm('La restauración reemplazará todos los datos de este navegador. Descargue antes una copia de seguridad. ¿Continuar?')) return;
      restore(d);setMessage('Respaldo restaurado en este navegador.');
    } catch(e){setMessage(e instanceof Error?e.message:'No se pudo leer el respaldo.');}
  };
  return <><div className="title"><div><h1>Copias de seguridad</h1><p>Exporte o restaure los datos guardados en este navegador.</p></div></div><div className="card form"><button className="primary" onClick={download}>Descargar respaldo JSON</button><label>Restaurar respaldo<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void load(file);e.target.value='';}}/></label><p className="warning">El archivo contiene información contable sin cifrar. Guárdelo en un lugar seguro; no lo comparta públicamente.</p>{message&&<p role="status">{message}</p>}</div></>;
}
