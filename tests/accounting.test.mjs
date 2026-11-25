import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntry,validateOpening,incomeStatement,position} from '../lib/accounting.mjs';
const line=(account,debit,credit)=>({account,name:account,debit,credit});
test('venta gravada de 1180 y costo de 600',()=>{
 const entries=[{lines:[line('12',1180,0),line('40',0,180),line('70',0,1000)]},{lines:[line('69',600,0),line('20',0,600)]}];
 entries.forEach(validateEntry);
 assert.deepEqual(incomeStatement(entries),{sales:1000,cost:600,gross:400,operating:0,other:0,net:400});
 assert.equal(position(entries).difference,0);
});
test('rechaza asientos inválidos y descuadrados',()=>{
 assert.throws(()=>validateEntry({lines:[line('10',1,0),line('50',0,2)]}));
 assert.throws(()=>validateEntry({lines:[line('10',-1,0),line('50',0,-1)]}));
});
test('destino de mercaderías no convierte la compra en gasto',()=>{
 const entries=[{lines:[line('60',500,0),line('40',90,0),line('42',0,590)]},{lines:[line('20',500,0),line('61',0,500)]}];
 entries.forEach(validateEntry);
 assert.equal(incomeStatement(entries).net,0);
 assert.equal(position(entries).difference,0);
});
test('apertura cuadrada y prevención de duplicados por ejercicio',()=>{
 const entry={date:'2026-01-01',lines:[line('10',2000,0),line('42',0,500),line('50',0,1500)]};
 assert.equal(validateOpening(entry,[]),true);
 assert.throws(()=>validateOpening(entry,[{type:'Apertura',date:'2026-02-01'}]),/Ya existe/);
 assert.throws(()=>validateOpening({...entry,lines:[line('60',2000,0),line('50',0,2000)]},[]),/solo admite/);
 assert.equal(position([entry]).difference,0);
});

test('corrige solo el céntimo de IGV asociado a un documento y conserva el original',async()=>{
 const {repairDocumentRounding}=await import('../lib/accounting.mjs');
 const doc={id:'F',date:'2026-11-24',kind:'Venta',status:'Contabilizado',tax:'Gravado',included:true,total:1280,base:1084.75,igv:195.26};
 const entry={id:'AS-F',type:'Venta',lines:[line('12',1280,0),line('40',0,195.26),line('70',0,1084.75)]};
 const result=repairDocumentRounding([doc],[entry]);
 assert.equal(result.documents[0].igv,195.25);assert.equal(result.entries[0].lines[1].credit,195.25);assert.equal(entry.lines[1].credit,195.26);validateEntry(result.entries[0]);
 assert.equal(repairDocumentRounding([doc],[entry],['2026-11']).changes.length,0);
 assert.equal(repairDocumentRounding([{...doc,igv:195.27}],[entry]).changes.length,0);
});
test('rechaza fracciones de céntimo y fechas imposibles',()=>{
 assert.throws(()=>validateEntry({lines:[line('10',1.001,0),line('50',0,1.001)]}),/decimales/);
 assert.throws(()=>validateOpening({date:'2026-02-30',lines:[line('10',10,0),line('50',0,10)]},[]),/fecha válida/);
});
