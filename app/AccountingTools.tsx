"use client";
import { useMemo, useState } from 'react';
import { validateEntry, validateOpening } from '../lib/accounting.mjs';
import { ledgerForPeriod } from '../lib/ledger-report.mjs';

export type Line={account:string;name:string;debit:number;credit:number};
type DraftLine=Omit<Line,'debit'|'credit'> & {debit:string;credit:string};
export type Entry={id:string;date:string;type:string;memo:string;reference?:string;lines:Line[]};
export type Account={code:string;name:string;nature:string;official:boolean};
const format=(x:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(x);
const dateString=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function Periods({closed,onClose,onReopen}:{closed:string[];onClose:(period:string)=>void;onReopen:(period:string)=>void}) {
 const [period,setPeriod]=useState(dateString().slice(0,7));
 const isClosed=closed.includes(period);
 return <><div className="title"><div><h1>Periodos contables</h1><p>Bloquee nuevos asientos para un mes en este navegador.</p></div></div><div className="card form"><label>Periodo<input type="month" value={period} onChange={e=>setPeriod(e.target.value)}/></label><p>Estado: <b>{isClosed?'Cerrado':'Abierto'}</b></p>{isClosed?<button className="primary" onClick={()=>{if(confirm(`¿Reabrir ${period}? Se permitirá registrar nuevas operaciones.`))onReopen(period)}}>Reabrir periodo</button>:<button className="primary" onClick={()=>{if(period&&confirm(`¿Cerrar ${period}? No se podrán registrar nuevos asientos en este periodo.`))onClose(period)}}>Cerrar periodo</button>}<p className="hint">Control local sin autenticación ni auditoría. La reapertura no requiere autorización; no sustituye un control empresarial.</p></div></>;
}

export function ManualEntry({accounts,close,save}:{accounts:Account[];close:()=>void;save:(entry:Entry)=>void}) {
 const [date,setDate]=useState(dateString()),[memo,setMemo]=useState(''),[reference,setReference]=useState(''),[error,setError]=useState('');
 const initial=(a:Account):DraftLine=>({account:a.code,name:a.name,debit:'',credit:''});
 const [lines,setLines]=useState<DraftLine[]>(()=>[initial(accounts[0]),initial(accounts[1]||accounts[0])]);
 const totals=lines.reduce((x,l)=>({debit:x.debit+Math.round(Number(l.debit)*100),credit:x.credit+Math.round(Number(l.credit)*100)}),{debit:0,credit:0});
 const change=(index:number,patch:Partial<DraftLine>)=>setLines(old=>old.map((x,i)=>i===index?{...x,...patch}:x));
 const submit=()=>{try{if(!date||!memo.trim())throw new Error('Complete la fecha y la glosa.');const entry:Entry={id:`MAN-${crypto.randomUUID()}`,date,type:'Manual',memo:memo.trim(),reference:reference.trim(),lines:lines.map(x=>({...x,debit:Number(x.debit),credit:Number(x.credit)})).filter(x=>x.debit||x.credit)};validateEntry(entry);save(entry)}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el asiento.')}};
 return <div className="overlay"><div className="modal"><div className="modalhead"><h2>Asiento contable manual</h2><button onClick={close} aria-label="Cerrar">✕</button></div><div className="form modalform"><div className="two"><label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Referencia<input value={reference} onChange={e=>setReference(e.target.value)}/></label></div><label>Glosa<input value={memo} onChange={e=>setMemo(e.target.value)}/></label><div className="tablewrap"><table><thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th><th></th></tr></thead><tbody>{lines.map((row,i)=><tr key={i}><td><select aria-label={`Cuenta ${i+1}`} value={row.account} onChange={e=>{const a=accounts.find(x=>x.code===e.target.value);if(a)change(i,{account:a.code,name:a.name})}}>{accounts.map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></td><td><input aria-label={`Debe ${i+1}`} type="number" min="0" step="0.01" value={row.debit} onChange={e=>change(i,{debit:e.target.value})}/></td><td><input aria-label={`Haber ${i+1}`} type="number" min="0" step="0.01" value={row.credit} onChange={e=>change(i,{credit:e.target.value})}/></td><td><button onClick={()=>setLines(old=>old.filter((_,j)=>i!==j))}>Quitar</button></td></tr>)}</tbody></table></div><p>Debe: {format(totals.debit/100)} · Haber: {format(totals.credit/100)} · Diferencia: {format((totals.debit-totals.credit)/100)}</p>{error&&<p role="alert" className="warning">{error}</p>}<div className="modalactions"><button onClick={()=>setLines(old=>[...old,initial(accounts[0])])}>Añadir fila</button><button className="primary" onClick={submit}>Contabilizar</button></div></div></div></div>;
}

export function CashLedger({entries,period}:{entries:Entry[];period:string}) {
 const movements=entries.flatMap(e=>e.lines.filter(l=>l.account==='10'||l.account.startsWith('101')).map((line,i)=>({entry:e,line,key:e.id+'-'+i}))).sort((a,b)=>a.entry.date.localeCompare(b.entry.date)||a.entry.id.localeCompare(b.entry.id));
 let balance=0;const opening=period?movements.filter(x=>x.entry.date<`${period}-01`).reduce((a,x)=>a+Math.round(x.line.debit*100)-Math.round(x.line.credit*100),0):0;
 return <><div className="title"><div><h1>Libro de caja</h1><p>Consulta de movimientos de las cuentas 10 y 101 desde el Libro Diario.</p></div></div><p>Saldo inicial del periodo: <b>{format(opening/100)}</b></p><div className="card tablewrap"><table><thead><tr><th>Fecha</th><th>Documento</th><th>Concepto</th><th>Cuenta</th><th>Ingreso</th><th>Egreso</th><th>Saldo</th></tr></thead><tbody>{movements.map(({entry,line,key})=>{balance+=Math.round(line.debit*100)-Math.round(line.credit*100);if(period&&!entry.date.startsWith(period))return null;return <tr key={key}><td>{entry.date.split('-').reverse().join('/')}</td><td>{entry.reference||entry.id}</td><td>{entry.memo}</td><td>{line.account}</td><td>{format(line.debit)}</td><td>{format(line.credit)}</td><td>{format(balance/100)}</td></tr>})}{!movements.some(x=>!period||x.entry.date.startsWith(period))&&<tr><td colSpan={7} className="empty">Sin movimientos en el periodo.</td></tr>}</tbody></table><p className="hint">La cuenta general 10 puede incluir bancos; este reporte no sustituye la separación de cajas y cuentas bancarias.</p></div></>;
}

export function OpeningBalance({accounts,entries,save}:{accounts:Account[];entries:Entry[];save:(entry:Entry)=>boolean}) {
  const [date,setDate]=useState(dateString());
  const [rows,setRows]=useState<DraftLine[]>([{account:'10',name:'Efectivo y equivalentes de efectivo',debit:'',credit:''},{account:'50',name:'Capital',debit:'',credit:''}]);
  const [error,setError]=useState('');
  const total=useMemo(()=>rows.reduce((a,x)=>({debit:a.debit+Math.round(Number(x.debit)*100),credit:a.credit+Math.round(Number(x.credit)*100)}),{debit:0,credit:0}),[rows]);
  const update=(index:number,change:Partial<DraftLine>)=>setRows(old=>old.map((row,i)=>i===index?{...row,...change}:row));
  const submit=()=>{
    try {
      const active=rows.map(x=>({...x,debit:Number(x.debit),credit:Number(x.credit)})).filter(x=>x.debit!==0||x.credit!==0);
      const entry:Entry={id:`APE-${crypto.randomUUID()}`,date,type:'Apertura',memo:'Asiento de apertura',lines:active};
      validateOpening(entry,entries); if(save(entry)) setError('Asiento de apertura registrado.');
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo registrar.');}
  };
  return <><div className="title"><div><h1>Balance inicial</h1><p>Registre saldos de apertura. Los importes deben cuadrar antes de contabilizar.</p></div></div><div className="card"><div className="form"><label>Fecha de apertura<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="tablewrap"><table><thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th><th></th></tr></thead><tbody>{rows.map((row,i)=><tr key={i}><td><select aria-label={`Cuenta ${i+1}`} value={row.account} onChange={e=>{const a=accounts.find(a=>a.code===e.target.value);if(a)update(i,{account:a.code,name:a.name})}}>{accounts.filter(a=>['1','2','3','4','5'].includes(a.code[0])).map(a=><option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select></td><td><input aria-label={`Debe ${i+1}`} type="number" min="0" step="0.01" value={row.debit} onChange={e=>update(i,{debit:e.target.value})}/></td><td><input aria-label={`Haber ${i+1}`} type="number" min="0" step="0.01" value={row.credit} onChange={e=>update(i,{credit:e.target.value})}/></td><td><button onClick={()=>setRows(old=>old.filter((_,j)=>i!==j))}>Quitar</button></td></tr>)}</tbody></table></div><p>Debe: <b>{format(total.debit/100)}</b> · Haber: <b>{format(total.credit/100)}</b> · Diferencia: <b>{format((total.debit-total.credit)/100)}</b></p><div className="modalactions"><button onClick={()=>setRows(old=>[...old,{account:'10',name:'Efectivo y equivalentes de efectivo',debit:'',credit:''}])}>Añadir fila</button><button className="primary" onClick={submit}>Registrar apertura</button></div>{error&&<p role="status">{error}</p>}<p className="hint">La apertura solo registra el asiento contable; no crea existencias ni cuentas bancarias. No utilice esta versión para contabilidad real.</p></div></>;
}

export function GeneralLedger({entries,period}:{entries:Entry[];period:string}) {
 const codes=useMemo(()=>[...new Set(entries.flatMap(e=>e.lines.map(l=>l.account)))].sort(),[entries]);
 const [selected,setSelected]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const start=period?`${period}-01`:from, end=period?`${period}-31`:to;
 const account=selected || codes[0] || '',invalid=!!start&&!!end&&start>end;
 const report=invalid?null:ledgerForPeriod(entries,account,start,end);
 const signed=(value:number)=>value===0?format(0):`${format(Math.abs(value)/100)} ${value<0?'A':'D'}`;
 return <><div className="title"><div><h1>Libro Mayor</h1><p>Movimientos y saldos por cuenta y período.</p></div></div><div className="card"><div className="form"><label>Cuenta<select value={account} onChange={e=>setSelected(e.target.value)}>{codes.map(c=><option key={c} value={c}>{c} · {entries.flatMap(e=>e.lines).find(l=>l.account===c)?.name}</option>)}</select></label>{!period&&<div className="two"><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}</div>{invalid?<p className="warning" role="alert">La fecha inicial no puede ser posterior a la final.</p>:report&&<><p>Saldo inicial: <b>{signed(report.opening)}</b></p><div className="tablewrap"><table><thead><tr><th>Fecha</th><th>Asiento</th><th>Referencia</th><th>Glosa</th><th>Debe</th><th>Haber</th><th>Saldo deudor / acreedor</th></tr></thead><tbody>{report.rows.map(({entry,line,index,balance})=><tr key={entry.id+'-'+index}><td>{entry.date.split('-').reverse().join('/')}</td><td>{entry.id}</td><td>{entry.reference||'—'}</td><td>{entry.memo}</td><td>{format(line.debit)}</td><td>{format(line.credit)}</td><td>{signed(balance)}</td></tr>)}{!report.rows.length&&<tr><td colSpan={7} className="empty">Sin movimientos en el período.</td></tr>}</tbody></table></div><p>Debe: <b>{format(report.debit/100)}</b> · Haber: <b>{format(report.credit/100)}</b> · Saldo final: <b>{signed(report.closing)}</b></p></>}</div></>;
}

export type CashAudit={id:string;date:string;responsible:string;notes:string;counts:number[];physical:number;book:number};
export function CashCount({entries,audits,save}:{entries:Entry[];audits:CashAudit[];save:(audit:CashAudit)=>void}) {
  const denominations=[200,100,50,20,10,5,2,1,0.5,0.2,0.1];
  const [counts,setCounts]=useState<string[]>(denominations.map(()=>''));
  const [responsible,setResponsible]=useState(''),[notes,setNotes]=useState(''),[date,setDate]=useState(dateString()),[message,setMessage]=useState('');
  const physical=counts.reduce((a,c,i)=>a+Math.round(denominations[i]*100)*Number(c),0)/100;
  const book=entries.filter(e=>e.date<=date).flatMap(e=>e.lines).filter(l=>l.account.startsWith('101')).reduce((a,l)=>a+Math.round(l.debit*100)-Math.round(l.credit*100),0)/100;
  return <><div className="title"><div><h1>Arqueo de caja</h1><p>Compare el recuento físico con el saldo registrado en las cuentas seleccionadas.</p></div><button className="primary" onClick={()=>window.print()}>Imprimir acta</button></div><div className="card"><div className="form"><label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Responsable<input value={responsible} onChange={e=>setResponsible(e.target.value)}/></label><label>Observaciones<input value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><table><thead><tr><th>Denominación</th><th>Cantidad</th><th>Subtotal</th></tr></thead><tbody>{denominations.map((d,i)=><tr key={d}><td>{format(d)}</td><td><input aria-label={`Cantidad ${d}`} type="number" min="0" step="1" value={counts[i]} onChange={e=>setCounts(old=>old.map((x,j)=>i===j?e.target.value:x))}/></td><td>{format(d*Number(counts[i]))}</td></tr>)}</tbody></table><p>Efectivo físico: <b>{format(physical)}</b> · Saldo de cuenta 101: <b>{format(book)}</b> · Diferencia: <b>{format(physical-book)}</b></p><button className="primary" onClick={()=>{if(!date||!responsible.trim()){setMessage("Indique fecha y responsable.");return}if(counts.some(c=>c!==''&&(!Number.isSafeInteger(Number(c))||Number(c)<0))){setMessage("Las cantidades deben ser números enteros no negativos.");return}save({id:crypto.randomUUID(),date,responsible:responsible.trim(),notes,counts:counts.map(Number),physical,book});setMessage("Arqueo guardado.")}}>Guardar arqueo</button>{message&&<p role="status">{message}</p>}<p className="hint">El arqueo guarda el recuento; no genera ajustes contables. Los movimientos históricos registrados en la cuenta general 10 no están identificados como caja.</p><h3>Historial de arqueos</h3>{audits.map(a=><div className="movement" key={a.id}><span>{a.date} · {a.responsible}</span><b>{format(a.physical)} · diferencia {format(a.physical-a.book)}</b></div>)}</div></>;
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
