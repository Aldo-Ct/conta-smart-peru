import {validateEntry} from './accounting.mjs';
/** Detalla el pago al contado y vincula la transferencia al asiento existente. */
export function createCashPayment(doc,banks,accounts,movements){
 if(doc.payment!=='Contado'||!['Efectivo','Transferencia'].includes(doc.paymentMethod))throw new Error('Seleccione efectivo o transferencia para el pago al contado.');
 const sale=doc.kind==='Venta',bank=doc.paymentMethod==='Transferencia'?banks.find(b=>b.id===doc.bankId):undefined;
 const account=doc.paymentMethod==='Efectivo'?accounts.find(a=>a.code==='101'&&a.active!==false):accounts.find(a=>a.code===bank?.accountCode&&a.active!==false);
 if(!account||(doc.paymentMethod==='Transferencia'&&(!bank||!account.code.startsWith('104'))))throw new Error('Seleccione una cuenta bancaria activa; para efectivo se requiere la cuenta 101 activa.');
 const reference=(doc.paymentReference||'').trim();
 if(bank&&!reference)throw new Error('Ingrese el número de operación de la transferencia.');
 if(bank&&movements.some(m=>m.bankId===bank.id&&m.reference?.trim().toLowerCase()===reference.toLowerCase()))throw new Error('El número de operación ya está registrado en esta cuenta bancaria.');
 const receivable=sale?'12':doc.voucherType==='Recibo por honorarios'?'46':'42';
 const cashLine={account:account.code,name:account.name,debit:sale?doc.total:0,credit:sale?0:doc.total};
 const otherLine={account:receivable,name:sale?'Cuentas por cobrar':'Cuentas por pagar',debit:sale?0:doc.total,credit:sale?doc.total:0};
 const entry={id:`COB-${doc.id}`,date:doc.date,type:sale?'Cobranza':'Pago',memo:`${doc.kind} al contado · ${doc.party}`,reference:doc.id,lines:sale?[cashLine,otherLine]:[otherLine,cashLine]};validateEntry(entry);
 const movement=bank?{id:`BAN-${doc.id}`,bankId:bank.id,date:doc.date,kind:sale?'Ingreso':'Egreso',amount:doc.total,memo:entry.memo,reference,entryId:entry.id}:undefined;
 return {entry,movement};
}
