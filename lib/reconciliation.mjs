import {cents} from './accounting.mjs';
export function uniqueReconciliationSuggestions(bankId,statements,movements,matches){
 const usedStatements=new Set(matches.map(x=>x.statementId)),usedMovements=new Set(matches.map(x=>x.movementId));
 const availableStatements=statements.filter(s=>s.bankId===bankId&&!usedStatements.has(s.id)),availableMovements=movements.filter(m=>m.bankId===bankId&&!usedMovements.has(m.id));
 const candidates=s=>availableMovements.filter(m=>m.date===s.date&&m.kind===s.kind&&cents(m.amount)===cents(s.amount)&&(!m.reference||m.reference.trim().toLowerCase()===s.reference.trim().toLowerCase()));
 const proposals=availableStatements.map(s=>({statement:s,matches:candidates(s)})).filter(x=>x.matches.length===1);
 return proposals.filter(x=>proposals.filter(y=>y.matches[0].id===x.matches[0].id).length===1).map(x=>({statementId:x.statement.id,movementId:x.matches[0].id}));
}
export function validateStatement(input,existing){
 if(!input?.id||!input.bankId||!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||Number.isNaN(Date.parse(input.date+'T00:00:00Z'))||new Date(input.date+'T00:00:00Z').toISOString().slice(0,10)!==input.date||!['Ingreso','Egreso'].includes(input.kind)||!input.reference?.trim()||!input.memo?.trim()||!Number.isFinite(input.amount)||input.amount<=0||Math.abs(input.amount*100-Math.round(input.amount*100))>0.000001)throw new Error('Revise fecha, referencia, concepto e importe del extracto.');
 if(existing.some(x=>x.id===input.id||(x.bankId===input.bankId&&x.reference.trim().toLowerCase()===input.reference.trim().toLowerCase())))throw new Error('La referencia ya existe para esta cuenta.');
 return {...input,reference:input.reference.trim(),memo:input.memo.trim()};
}
