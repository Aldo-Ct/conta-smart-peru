import test from 'node:test';
import assert from 'node:assert/strict';
import {addCustomAccount,setAccountActive,mergeReferenceChart,editAccount} from '../lib/chart.mjs';
const official=[{code:'10',name:'Efectivo',nature:'Deudora',official:true}];
test('cuentas personalizadas requieren jerarquía y código único',()=>{
 const result=addCustomAccount(official,{code:'101',name:'Caja',nature:'Deudora'});
 assert.equal(result[1].official,false);
 assert.throws(()=>addCustomAccount(result,{code:'101',name:'Otra',nature:'Deudora'}),/existe/);
 assert.throws(()=>addCustomAccount(result,{code:'1021',name:'Otra',nature:'Deudora'}),/superior/);
 assert.equal(official.length,1);
});
test('desactivar conserva código y denominación',()=>{
 const result=setAccountActive(official,'10',false);
 assert.deepEqual(result[0],{...official[0],active:false});
 assert.equal(official[0].active,undefined);
});
test('fusionar catálogo conserva las cuentas existentes e incorpora solo códigos faltantes',()=>{
 const merged=mergeReferenceChart(official,[{code:'10',name:'Otra versión'},{code:'101',name:'Caja'}]);
 assert.equal(merged[0].name,'Efectivo');assert.equal(merged[1].sourceName,'Caja');
 assert.equal(mergeReferenceChart(merged,[{code:'101',name:'Caja'}]).length,2);
 const edited=editAccount(merged,'101',{name:'Caja principal',nature:'Deudora'});
 assert.equal(edited[1].code,'101');assert.equal(edited[1].sourceName,'Caja');assert.equal(merged[1].name,'Caja');
});
