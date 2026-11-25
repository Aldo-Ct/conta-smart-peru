import {SnapshotValidationError} from './validate-snapshot.mjs';
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}':JSON.stringify(value);
/** Protege periodos cerrados también cuando se recibe una copia completa. */
export function validateTransition(previous,next,role){
 const closed=new Set(previous?.closedPeriods||[]),remaining=new Set(next?.closedPeriods||[]);
 if(role!=='admin'&&[...closed].some(month=>!remaining.has(month)))throw new SnapshotValidationError('Solo un administrador puede reabrir un periodo.');
 for(const key of ['docs','settlements','inventoryMovements']){
  const oldList=previous?.[key]||[],newList=next?.[key]||[],oldRows=new Map(oldList.map(row=>[row.id,row])),newRows=new Map(newList.map(row=>[row.id,row]));
  for(const row of oldList)if(closed.has(row.date?.slice(0,7))&&stable(row)!==stable(newRows.get(row.id)))throw new SnapshotValidationError('No se pueden modificar operaciones de un periodo cerrado.');
  for(const row of newList)if(closed.has(row.date?.slice(0,7))&&!oldRows.has(row.id))throw new SnapshotValidationError('No se pueden agregar operaciones a un periodo cerrado.');
 }
 const oldEntries=new Map((previous?.entries||[]).map(entry=>[entry.id,entry]));
 const newEntries=new Map((next?.entries||[]).map(entry=>[entry.id,entry]));
 for(const entry of previous?.entries||[]){if(closed.has(entry.date?.slice(0,7))&&stable(entry)!==stable(newEntries.get(entry.id)))throw new SnapshotValidationError('No se pueden modificar ni eliminar asientos de un periodo cerrado.');}
 for(const entry of next?.entries||[]){if(closed.has(entry.date?.slice(0,7))&&!oldEntries.has(entry.id))throw new SnapshotValidationError('No se pueden agregar asientos a un periodo cerrado.');}
}
