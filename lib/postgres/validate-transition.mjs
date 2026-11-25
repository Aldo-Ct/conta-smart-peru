import {SnapshotValidationError} from './validate-snapshot.mjs';
import {findDuplicateVoucher,validateSaleInvoiceIdentity,purchaseCost} from '../vouchers.mjs';
import {cents} from '../accounting.mjs';
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}':JSON.stringify(value);
/** Protege periodos cerrados también cuando se recibe una copia completa. */
export function validateTransition(previous,next,role){
 const priorDocs=new Map((previous?.docs||[]).map(doc=>[doc.id,doc]));
 for(const doc of next?.docs||[]){const before=priorDocs.get(doc.id);if(!before||['kind','voucherType','invoiceNumber','document','party'].some(k=>before[k]!==doc[k])){try{validateSaleInvoiceIdentity(doc)}catch(error){throw new SnapshotValidationError(error.message)}if(findDuplicateVoucher(doc,next.docs))throw new SnapshotValidationError('Ya existe un comprobante con el mismo tipo, serie y número para esta operación.');}}
 const nextDocs=new Map((next?.docs||[]).map(d=>[d.id,d]));
 for(const old of previous?.docs||[])if(!nextDocs.has(old.id))throw new SnapshotValidationError('No se puede eliminar un comprobante contabilizado; use una reversión.');
 const nextEntryIds=new Set((next?.entries||[]).map(e=>e.id));
 for(const old of previous?.entries||[])if(!nextEntryIds.has(old.id))throw new SnapshotValidationError('No se puede eliminar un asiento registrado; use una reversión.');
 for(const doc of next?.docs||[]){
  if(priorDocs.has(doc.id)||doc.status!=='Contabilizado')continue;
  const entry=(next.entries||[]).find(e=>e.id===`AS-${doc.id}`&&e.reference===doc.id&&e.type===doc.kind&&e.date===doc.date);
  const product=(next.products||[]).find(p=>p.id===doc.productId);if(!entry||!product)throw new SnapshotValidationError('El comprobante necesita un producto y un asiento vinculado.');
  const sale=doc.kind==='Venta',credit=sale||doc.taxCreditEligible!==false&&doc.voucherType!=='Boleta'&&doc.voucherType!=='Recibo por honorarios'&&doc.voucherType!=='Recibo por arrendamiento 1683',payable=['Recibo por honorarios','Recibo por arrendamiento 1683'].includes(doc.voucherType)?'46':'42';
  const expected=sale?[['12',doc.total,0],['40',0,doc.igv],['70',0,doc.base]]:[[product.type==='Servicio'?'63':'60',purchaseCost(doc),0],['40',credit?doc.igv:0,0],[payable,0,doc.total]];
  const actual=entry.lines.map(l=>[l.account,cents(l.debit),cents(l.credit)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  const wanted=expected.map(([a,d,c])=>[a,cents(d),cents(c)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  if(JSON.stringify(actual)!==JSON.stringify(wanted))throw new SnapshotValidationError('El asiento no coincide con los importes y cuentas del comprobante.');
  if(product.type==='Mercadería'){
   const m=(next.inventoryMovements||[]).find(x=>x.id===doc.id),linked=(next.entries||[]).find(e=>e.id===`${sale?'COS':'DES'}-${doc.id}`&&e.reference===doc.id);
   if(!m||!linked)throw new SnapshotValidationError('La mercadería requiere su movimiento y asiento de inventario.');
   const amount=sale?m.movementCents:cents(purchaseCost(doc));
   if(m.movementCents!==amount)throw new SnapshotValidationError('La valorización no coincide con la compra.');
   const expectedInventory=sale?[['69',amount,0],['20',0,amount]]:[['20',amount,0],['61',0,amount]];
   const actualInventory=linked.lines.map(l=>[l.account,cents(l.debit),cents(l.credit)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
   expectedInventory.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
   if(JSON.stringify(actualInventory)!==JSON.stringify(expectedInventory))throw new SnapshotValidationError('El asiento de inventario no coincide con el movimiento.');
  }
 }
 const oldInventory=new Set((previous?.inventoryMovements||[]).map(m=>m.id));
 for(const old of previous?.inventoryMovements||[])if(!(next?.inventoryMovements||[]).some(m=>m.id===old.id))throw new SnapshotValidationError('No se puede eliminar un movimiento de inventario.');
 for(const m of next?.inventoryMovements||[]){
  if(oldInventory.has(m.id))continue;
  const doc=nextDocs.get(m.id),product=(next.products||[]).find(p=>p.id===m.productId);
  if(!doc||doc.status!=='Contabilizado'||!product||product.type!=='Mercadería'||doc.productId!==m.productId||doc.kind!==m.kind||doc.date!==m.date||doc.qty!==m.quantity||!Number.isSafeInteger(m.quantity)||m.quantity<=0||!Number.isSafeInteger(m.balanceQuantity)||m.balanceQuantity<0||!Number.isSafeInteger(m.movementCents)||m.movementCents<0||!Number.isSafeInteger(m.balanceCents)||m.balanceCents<0)throw new SnapshotValidationError('El movimiento de inventario no coincide con su comprobante.');
 }
 const closed=new Set(previous?.closedPeriods||[]),remaining=new Set(next?.closedPeriods||[]);
 if(role!=='admin'&&[...closed].some(month=>!remaining.has(month)))throw new SnapshotValidationError('Solo un administrador puede reabrir un periodo.');
 for(const key of ['docs','settlements','inventoryMovements','bankMovements']){
  const oldList=previous?.[key]||[],newList=next?.[key]||[],oldRows=new Map(oldList.map(row=>[row.id,row])),newRows=new Map(newList.map(row=>[row.id,row]));
  for(const row of oldList)if(closed.has(row.date?.slice(0,7))&&stable(row)!==stable(newRows.get(row.id)))throw new SnapshotValidationError('No se pueden modificar operaciones de un periodo cerrado.');
  for(const row of newList)if(closed.has(row.date?.slice(0,7))&&!oldRows.has(row.id))throw new SnapshotValidationError('No se pueden agregar operaciones a un periodo cerrado.');
 }
 const nextCheques=new Map((next?.bankCheques||[]).map(c=>[c.id,c]));
 for(const old of previous?.bankCheques||[]){const current=nextCheques.get(old.id);if(!current)throw new SnapshotValidationError('No se puede eliminar un cheque registrado.');for(const key of ['bankId','number','beneficiary','date','amount','memo','movementId'])if(stable(old[key])!==stable(current[key]))throw new SnapshotValidationError('No se pueden modificar los datos de un cheque emitido.');if(old.status!==current.status){if(old.status!=='Pendiente'||!['Cobrado','Anulado','Rechazado'].includes(current.status))throw new SnapshotValidationError('Cambio de estado de cheque no permitido.');const history=current.history||[],event=history.at(-1);if(history.length!==(old.history||[]).length+1||stable(history.slice(0,-1))!==stable(old.history)||closed.has(event?.date?.slice(0,7)))throw new SnapshotValidationError('Historial o periodo del cheque inválido.');}else if(stable(old.history)!==stable(current.history))throw new SnapshotValidationError('No se puede modificar el historial del cheque.');}
 const oldEntries=new Map((previous?.entries||[]).map(entry=>[entry.id,entry]));
 const newEntries=new Map((next?.entries||[]).map(entry=>[entry.id,entry]));
 for(const entry of previous?.entries||[]){if(closed.has(entry.date?.slice(0,7))&&stable(entry)!==stable(newEntries.get(entry.id)))throw new SnapshotValidationError('No se pueden modificar ni eliminar asientos de un periodo cerrado.');}
 for(const entry of next?.entries||[]){if(closed.has(entry.date?.slice(0,7))&&!oldEntries.has(entry.id))throw new SnapshotValidationError('No se pueden agregar asientos a un periodo cerrado.');}
}
