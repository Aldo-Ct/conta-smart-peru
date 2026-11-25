import {cents,validateEntry} from './accounting.mjs';

export function remainingBalance(document,settlements) {
  const applied=settlements.filter(x=>x.documentId===document.id).reduce((sum,x)=>sum+cents(x.amount),0);
  return (cents(document.total)-applied)/100;
}

export function createSettlement(document,settlements,{id,date,amount,bank,reference="",existingMovements=[]}) {
  if(document.status!=='Contabilizado'||document.payment!=='Crédito') throw new Error('Solo se pueden liquidar documentos contabilizados al crédito.');
  if(!id||settlements.some(x=>x.id===id)) throw new Error('La operación ya fue registrada.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<document.date) throw new Error('La fecha no puede ser anterior al documento.');
  const parsedDate=new Date(`${date}T00:00:00Z`);if(Number.isNaN(parsedDate.valueOf())||parsedDate.toISOString().slice(0,10)!==date)throw new Error('Seleccione una fecha válida.');
  if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.000001) throw new Error('Ingrese un importe positivo con un máximo de dos decimales.');
  const balance=cents(remainingBalance(document,settlements)), value=cents(amount);
  if(value>balance) throw new Error('El importe supera el saldo pendiente.');
  if(bank&&(!bank.id||!bank.accountCode?.startsWith('104')||!reference.trim())) throw new Error('Seleccione un banco e indique el número de operación.');
  if(bank&&existingMovements.some(m=>m.bankId===bank.id&&m.reference?.trim().toLowerCase()===reference.trim().toLowerCase())) throw new Error('La referencia bancaria ya existe.');
  const cashAccount=bank?bank.accountCode:'101';
  const cashName=bank?bank.name:'Caja';
  const sale=document.kind==='Venta',payable=document.voucherType==='Recibo por honorarios'?'46':'42';
  const lines=sale?[{account:cashAccount,name:cashName,debit:amount,credit:0},{account:'12',name:'Cuentas por cobrar comerciales',debit:0,credit:amount}]:[{account:payable,name:payable==='46'?'Cuentas por pagar diversas':'Cuentas por pagar comerciales',debit:amount,credit:0},{account:cashAccount,name:cashName,debit:0,credit:amount}];
  const entry={id:`AS-${id}`,date,type:sale?'Cobranza':'Pago',memo:`${sale?'Cobranza':'Pago'}: ${document.party}${document.invoiceNumber ? ` · ${document.invoiceNumber}` : ''}`,reference:document.id,lines};
  validateEntry(entry);
  const movement=bank?{id:`BAN-${id}`,bankId:bank.id,date,kind:sale?'Ingreso':'Egreso',amount,memo:entry.memo,reference:reference.trim(),entryId:entry.id}:undefined;
  return {settlement:{id,documentId:document.id,date,amount,method:bank?'Banco':'Efectivo',...(bank?{bankId:bank.id,reference:reference.trim()}: {})},entry,movement};
}
