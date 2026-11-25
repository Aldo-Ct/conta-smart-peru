import {validateEntry,cents} from '../accounting.mjs';
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
   if(!monetary(doc.base)||!monetary(doc.igv)||!monetary(doc.total)||cents(doc.base)+cents(doc.igv)!==cents(doc.total)||doc.total<=0)fail('Importes del documento inválidos.');
   if(doc.status==='Contabilizado'&&!data.entries.some(e=>e.id===`AS-${doc.id}`||(e.reference===doc.id&&e.type===doc.kind)))fail('El documento contabilizado no tiene asiento vinculado.');
   docs.set(doc.id,doc);
  }
  const products=new Set();
  for(const product of data.products){if(!product||!product.id||products.has(product.id)||!Number.isSafeInteger(product.stock)||product.stock<0||!Number.isFinite(product.cost)||product.cost<0||!Number.isFinite(product.price)||product.price<0)fail('Producto o existencias inválidas.');products.add(product.id);}
  const settlementIds=new Set(),amounts=new Map();
  if(data.settlements!==undefined&&!Array.isArray(data.settlements))fail('Pagos inválidos.');
  for(const item of data.settlements||[]){
   const doc=docs.get(item?.documentId);if(!item?.id||settlementIds.has(item.id)||!doc||doc.payment!=='Crédito'||doc.status!=='Contabilizado'||!validDate(item.date)||item.date<doc.date||!monetary(item.amount)||item.amount<=0)fail('Pago o cobro inválido.');
   if(!data.entries.some(e=>e.id===`AS-${item.id}`&&e.reference===doc.id))fail('El pago o cobro no tiene asiento vinculado.');
   settlementIds.add(item.id);const total=(amounts.get(doc.id)||0)+cents(item.amount);if(total>cents(doc.total))fail('El pago o cobro excede el saldo.');amounts.set(doc.id,total);
  }
  return true;
 }catch(error){if(error instanceof SnapshotValidationError)throw error;throw new SnapshotValidationError(error instanceof Error?error.message:'Datos contables inválidos.');}
}
