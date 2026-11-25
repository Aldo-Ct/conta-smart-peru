import {createBankMovement} from './banks.mjs';
import {validateEntry} from './accounting.mjs';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export function issueCheque({bank,account,otherAccount,id,number,beneficiary,date,amount,memo,cheques=[],movements=[]}){
 if(!id||!number?.trim()||!beneficiary?.trim()||cheques.some(c=>c.id===id||(c.bankId===bank?.id&&c.number.trim().toLowerCase()===number.trim().toLowerCase())))throw new Error('Cheque inválido o número duplicado.');
 const result=createBankMovement({bank,account,otherAccount,id:`CHE-${id}`,date,kind:'Egreso',amount,memo,reference:`CH-${number.trim()}`,existing:movements});
 return {...result,cheque:{id,bankId:bank.id,number:number.trim(),beneficiary:beneficiary.trim(),date,amount:result.movement.amount,memo:memo.trim(),status:'Pendiente',movementId:result.movement.id,history:[{date,status:'Pendiente'}]}};
}
export function transitionCheque(cheque,status,date,entries,matches=[]){
 if(!cheque||cheque.status!=='Pendiente'||!['Cobrado','Anulado','Rechazado'].includes(status))throw new Error('Cambio de estado no permitido.');
 if(!validDate(date)||date<cheque.date)throw new Error('La fecha no puede ser anterior a la emisión.');
 const original=entries.find(e=>e.id===`AS-${cheque.movementId}`);if(!original)throw new Error('No se encuentra el asiento del cheque.');
 let reversal=null;
 if(status!=='Cobrado'){
  if(matches.some(m=>m.movementId===cheque.movementId))throw new Error('No se puede revertir un cheque conciliado.');
  const id=`REV-${cheque.id}`;if(entries.some(e=>e.id===id))throw new Error('El cheque ya tiene una reversión.');
  reversal={id,date,type:'Reversión de cheque',memo:`${status} · Cheque ${cheque.number}`,reference:original.id,lines:original.lines.map(l=>({...l,debit:l.credit,credit:l.debit}))};validateEntry(reversal);
 }
 return {cheque:{...cheque,status,history:[...(cheque.history||[]),{date,status}]},reversal};
}
