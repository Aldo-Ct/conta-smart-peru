import {cents} from './accounting.mjs';
/** Saldos de una cuenta exacta; las cifras internas se expresan en céntimos. */
export function ledgerForPeriod(entries,account,from='',to=''){
 if(from&&to&&from>to)throw new Error('La fecha inicial no puede ser posterior a la final.');
 const movements=entries.flatMap(e=>e.lines.map((line,index)=>({entry:e,line,index})).filter(x=>x.line.account===account)).sort((a,b)=>a.entry.date.localeCompare(b.entry.date)||a.entry.id.localeCompare(b.entry.id)||a.index-b.index);
 const opening=movements.filter(x=>from&&x.entry.date<from).reduce((sum,x)=>sum+cents(x.line.debit)-cents(x.line.credit),0);
 let running=opening,debit=0,credit=0;
 const rows=movements.filter(x=>(!from||x.entry.date>=from)&&(!to||x.entry.date<=to)).map(x=>{const d=cents(x.line.debit),c=cents(x.line.credit);debit+=d;credit+=c;running+=d-c;return {...x,balance:running}});
 return {opening,debit,credit,closing:running,rows};
}
