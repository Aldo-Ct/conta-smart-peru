import {cents,validateEntry} from './accounting.mjs';

export function remainingBalance(document,settlements) {
  const applied=settlements.filter(x=>x.documentId===document.id).reduce((sum,x)=>sum+cents(x.amount),0);
  return (cents(document.total)-applied)/100;
}

export function createSettlement(document,settlements,{id,date,amount}) {
  if(document.status!=='Contabilizado'||document.payment!=='Crédito') throw new Error('Solo se pueden liquidar documentos contabilizados al crédito.');
  if(!id||settlements.some(x=>x.id===id)) throw new Error('La operación ya fue registrada.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<document.date) throw new Error('La fecha no puede ser anterior al documento.');
  if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.000001) throw new Error('Ingrese un importe positivo con un máximo de dos decimales.');
  const balance=cents(remainingBalance(document,settlements)), value=cents(amount);
  if(value>balance) throw new Error('El importe supera el saldo pendiente.');
  const sale=document.kind==='Venta';
  const lines=sale?[{account:'10',name:'Efectivo y equivalentes de efectivo',debit:amount,credit:0},{account:'12',name:'Cuentas por cobrar comerciales',debit:0,credit:amount}]:[{account:'42',name:'Cuentas por pagar comerciales',debit:amount,credit:0},{account:'10',name:'Efectivo y equivalentes de efectivo',debit:0,credit:amount}];
  const entry={id:`AS-${id}`,date,type:sale?'Cobranza parcial':'Pago parcial',memo:`${sale?'Cobranza':'Pago'}: ${document.party}`,reference:document.id,lines};
  validateEntry(entry);
  return {settlement:{id,documentId:document.id,date,amount},entry};
}
