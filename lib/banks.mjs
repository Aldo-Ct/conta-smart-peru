import {cents,validateEntry} from './accounting.mjs';
function dateValid(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
export function createBankMovement({bank,account,otherAccount,id,date,kind,amount,memo,reference,existing=[]}){
 if(!bank||!account||account.code!==bank.accountCode||account.active===false||!account.code.startsWith('104'))throw new Error('Seleccione una cuenta bancaria contable activa.');
 if(!otherAccount||otherAccount.active===false||otherAccount.code===account.code)throw new Error('Seleccione una contrapartida activa distinta.');
 if(!id||existing.some(x=>x.id===id||(reference?.trim()&&x.bankId===bank.id&&x.reference?.trim().toLowerCase()===reference.trim().toLowerCase())))throw new Error('Movimiento o referencia duplicados.');
 if(!dateValid(date)||!['Ingreso','Egreso'].includes(kind)||!memo?.trim())throw new Error('Revise fecha, tipo y concepto.');
 if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.000001)throw new Error('El importe debe ser positivo y tener hasta dos decimales.');
 const incoming=kind==='Ingreso',value=cents(amount)/100;
 const lines=[{account:account.code,name:account.name,debit:incoming?value:0,credit:incoming?0:value},{account:otherAccount.code,name:otherAccount.name,debit:incoming?0:value,credit:incoming?value:0}];
 const entry={id:`AS-${id}`,date,type:`Banco · ${kind}`,memo:memo.trim(),reference:reference?.trim()||id,lines};validateEntry(entry);
 return {movement:{id,bankId:bank.id,date,kind,amount:value,memo:memo.trim(),reference:reference?.trim()||'',entryId:entry.id},entry};
}
export function bankBalance(entries,accountCode){return entries.flatMap(e=>e.lines).filter(l=>l.account===accountCode).reduce((sum,l)=>sum+cents(l.debit)-cents(l.credit),0)/100;}
