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
