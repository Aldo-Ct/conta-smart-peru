import {validateEntry,cents} from '../accounting.mjs';
import {validateVoucher} from '../vouchers.mjs';
import {validateStatement} from '../reconciliation.mjs';
export class SnapshotValidationError extends Error {}
const fail=message=>{throw new SnapshotValidationError(message)};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const monetary=value=>Number.isFinite(value)&&value>=0&&Math.abs(value*100-Math.round(value*100))<0.000001;
export function validateSnapshot(data){
 try {
  if(!data||typeof data!=='object'||Array.isArray(data))fail('Datos contables inválidos.');
  for(const key of ['accounts','products','docs','entries'])if(!Array.isArray(data[key]))fail(`Falta la lista ${key}.`);
  const ids=new Set();
  for(const entry of data.entries){if(!entry||typeof entry.id!=='string'||!entry.id||ids.has(entry.id))fail('Asiento duplicado o sin identificador.');ids.add(entry.id);validateEntry(entry);}
  const docs=new Map();
  for(const doc of data.docs){
   if(!doc||typeof doc.id!=='string'||!doc.id||docs.has(doc.id))fail('Documento duplicado o sin identificador.');
   if(!['Venta','Compra'].includes(doc.kind)||!validDate(doc.date)||!['Contado','Crédito'].includes(doc.payment)||!['Contabilizado','Borrador','Anulado'].includes(doc.status))fail('Documento con tipo, fecha o estado inválido.');
   validateVoucher(doc,(data.products||[]).find(p=>p.id===doc.productId));
   if(!monetary(doc.base)||!monetary(doc.igv)||!monetary(doc.total)||cents(doc.base)+cents(doc.igv)!==cents(doc.total)||doc.total<=0)fail('Importes del documento inválidos.');
   if(doc.status==='Contabilizado'&&!data.entries.some(e=>e.id===`AS-${doc.id}`||(e.reference===doc.id&&e.type===doc.kind)))fail('El documento contabilizado no tiene asiento vinculado.');
   docs.set(doc.id,doc);
  }
  const products=new Set();
  for(const product of data.products){if(!product||!product.id||products.has(product.id)||!Number.isSafeInteger(product.stock)||product.stock<0||!Number.isFinite(product.cost)||product.cost<0||!Number.isFinite(product.price)||product.price<0)fail('Producto o existencias inválidas.');products.add(product.id);}
  const settlementIds=new Set(),amounts=new Map();
  if(data.cashAudits!==undefined&&!Array.isArray(data.cashAudits))fail('Arqueos inválidos.');
  const auditIds=new Set(),denominations=[20000,10000,5000,2000,1000,500,200,100,50,20,10];
  for(const audit of data.cashAudits||[]){if(!audit?.id||auditIds.has(audit.id)||!validDate(audit.date)||!audit.responsible?.trim()||!Array.isArray(audit.counts)||audit.counts.length!==denominations.length||audit.counts.some(c=>!Number.isSafeInteger(c)||c<0)||!Number.isFinite(audit.book)||!monetary(audit.physical)||audit.counts.reduce((sum,c,i)=>sum+c*denominations[i],0)!==cents(audit.physical))fail('Arqueo de caja inválido.');auditIds.add(audit.id);}
  if(data.settlements!==undefined&&!Array.isArray(data.settlements))fail('Pagos inválidos.');
  for(const item of data.settlements||[]){
   const doc=docs.get(item?.documentId);if(!item?.id||settlementIds.has(item.id)||!doc||doc.payment!=='Crédito'||doc.status!=='Contabilizado'||!validDate(item.date)||item.date<doc.date||!monetary(item.amount)||item.amount<=0)fail('Pago o cobro inválido.');
   const settlementEntry=data.entries.find(e=>e.id===`AS-${item.id}`&&e.reference===doc.id);if(!settlementEntry)fail('El pago o cobro no tiene asiento vinculado.');
   if(item.method==='Efectivo'&&!settlementEntry.lines.some(l=>l.account==='101'&&cents(doc.kind==='Venta'?l.debit:l.credit)===cents(item.amount)))fail('El pago en efectivo no coincide con caja.');
   if(item.method==='Banco'){const bank=(data.bankAccounts||[]).find(b=>b.id===item.bankId),movement=(data.bankMovements||[]).find(m=>m.entryId===settlementEntry.id&&m.bankId===item.bankId);if(!bank||!movement||movement.kind!==(doc.kind==='Venta'?'Ingreso':'Egreso')||cents(movement.amount)!==cents(item.amount)||movement.reference!==item.reference)fail('El pago no coincide con el movimiento bancario.');}
   if(item.method&&!['Banco','Efectivo'].includes(item.method))fail('Medio de pago inválido.');
   settlementIds.add(item.id);const total=(amounts.get(doc.id)||0)+cents(item.amount);if(total>cents(doc.total))fail('El pago o cobro excede el saldo.');amounts.set(doc.id,total);
  }
  if(data.bankAccounts!==undefined&&!Array.isArray(data.bankAccounts))fail('Cuentas bancarias inválidas.');
  if(data.bankMovements!==undefined&&!Array.isArray(data.bankMovements))fail('Movimientos bancarios inválidos.');
  const bankIds=new Set(),bankCodes=new Set(),bankNumbers=new Set();
  for(const bank of data.bankAccounts||[]){if(!bank?.id||bankIds.has(bank.id)||!bank.name?.trim()||!bank.number?.trim()||bankNumbers.has(bank.number.trim())||!bank.accountCode?.startsWith('104')||bankCodes.has(bank.accountCode)||!data.accounts.some(a=>a.code===bank.accountCode))fail('Cuenta bancaria inválida o duplicada.');bankIds.add(bank.id);bankCodes.add(bank.accountCode);bankNumbers.add(bank.number.trim());}
  const bankMovementIds=new Set(),bankReferences=new Set();
  for(const movement of data.bankMovements||[]){
   const bank=(data.bankAccounts||[]).find(b=>b.id===movement?.bankId),entry=data.entries.find(e=>e.id===movement?.entryId);
   if(!movement?.id||bankMovementIds.has(movement.id)||!bank||!validDate(movement.date)||!['Ingreso','Egreso'].includes(movement.kind)||!monetary(movement.amount)||movement.amount<=0||!movement.memo?.trim()||!entry||entry.date!==movement.date)fail('Movimiento bancario inválido.');
   const line=entry.lines.find(l=>l.account===bank.accountCode),incoming=movement.kind==='Ingreso';
   if(!line||cents(incoming?line.debit:line.credit)!==cents(movement.amount)||cents(incoming?line.credit:line.debit)!==0)fail('El movimiento bancario no coincide con su asiento.');
   const ref=movement.reference?.trim().toLowerCase();if(ref){const key=`${bank.id}:${ref}`;if(bankReferences.has(key))fail('Referencia bancaria duplicada.');bankReferences.add(key);}
   bankMovementIds.add(movement.id);
  }
  if(data.bankCheques!==undefined&&!Array.isArray(data.bankCheques))fail('Cheques inválidos.');
  const chequeIds=new Set(),chequeNumbers=new Set();
  for(const cheque of data.bankCheques||[]){
   const movement=(data.bankMovements||[]).find(m=>m.id===cheque?.movementId),original=data.entries.find(e=>e.id===movement?.entryId),number=typeof cheque?.number==='string'?cheque.number.trim().toLowerCase():'';const key=`${cheque?.bankId}:${number}`;
   if(!cheque?.id||chequeIds.has(cheque.id)||!number||chequeNumbers.has(key)||!cheque.beneficiary?.trim()||!validDate(cheque.date)||!['Pendiente','Cobrado','Anulado','Rechazado'].includes(cheque.status)||!movement||movement.bankId!==cheque.bankId||movement.kind!=='Egreso'||movement.date!==cheque.date||cents(movement.amount)!==cents(cheque.amount)||!Array.isArray(cheque.history)||!cheque.history.length||cheque.history[0].status!=='Pendiente'||cheque.history[0].date!==cheque.date||cheque.history.at(-1).status!==cheque.status||cheque.history.some(h=>!validDate(h.date)||h.date<cheque.date))fail('Cheque inválido o sin movimiento bancario.');
   if(['Anulado','Rechazado'].includes(cheque.status)){
    const reversed=data.entries.find(e=>e.id===`REV-${cheque.id}`),tuple=l=>`${l.account}|${cents(l.debit)}|${cents(l.credit)}`;
    const expected=original?.lines.map(l=>tuple({...l,debit:l.credit,credit:l.debit})).sort(),actual=reversed?.lines.map(tuple).sort();
    if(!reversed||reversed.reference!==original?.id||JSON.stringify(expected)!==JSON.stringify(actual))fail('El cheque no tiene una reversión correcta.');
    if((data.bankMatches||[]).some(m=>m.movementId===movement.id))fail('No se puede revertir un cheque conciliado.');
   }
   chequeIds.add(cheque.id);chequeNumbers.add(key);
  }
  if(data.bankStatements!==undefined&&!Array.isArray(data.bankStatements))fail('Extracto bancario inválido.');
  if(data.bankMatches!==undefined&&!Array.isArray(data.bankMatches))fail('Conciliación inválida.');
  const statements=[];
  for(const item of data.bankStatements||[]){if(!bankIds.has(item?.bankId))fail('Extracto sin cuenta bancaria.');validateStatement(item,statements);statements.push(item);}
  const usedStatements=new Set(),usedMovements=new Set();
  for(const match of data.bankMatches||[]){const statement=statements.find(x=>x.id===match?.statementId),movement=(data.bankMovements||[]).find(x=>x.id===match?.movementId);if(!statement||!movement||statement.bankId!==movement.bankId||statement.date!==movement.date||statement.kind!==movement.kind||cents(statement.amount)!==cents(movement.amount)||usedStatements.has(statement.id)||usedMovements.has(movement.id))fail('Conciliación bancaria inválida o duplicada.');usedStatements.add(statement.id);usedMovements.add(movement.id);}
  return true;
 }catch(error){if(error instanceof SnapshotValidationError)throw error;throw new SnapshotValidationError(error instanceof Error?error.message:'Datos contables inválidos.');}
}
