import {validateEntry} from '../accounting.mjs';
/** Validación previa al almacenamiento: no modifica ni intenta reparar datos. */
export function validateSnapshot(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Datos contables inválidos.');
 for(const key of ['accounts','products','docs','entries'])if(!Array.isArray(data[key]))throw new Error(`Falta la lista ${key}.`);
 const ids=new Set();
 for(const entry of data.entries){
  if(!entry||typeof entry.id!=='string'||!entry.id||ids.has(entry.id))throw new Error('Asiento duplicado o sin identificador.');
  ids.add(entry.id);validateEntry(entry);
 }
 const docs=new Set();
 for(const doc of data.docs){if(!doc||typeof doc.id!=='string'||!doc.id||docs.has(doc.id))throw new Error('Documento duplicado o sin identificador.');docs.add(doc.id);}
 return true;
}
