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
test('se pueden editar cuentas referenciales y personalizadas sin alterar códigos',()=>{
 const accounts=addCustomAccount(official,{code:'101',name:'Caja',nature:'Deudora'});
 const changed=editAccount(editAccount(accounts,'10',{name:'Efectivo y bancos',nature:'Deudora'}),'101',{name:'Caja principal',nature:'Acreedora'});
 assert.equal(changed[0].name,'Efectivo y bancos');
 assert.equal(changed[1].name,'Caja principal');
 assert.deepEqual(changed.map(x=>x.code),['10','101']);
 assert.equal(accounts[0].name,'Efectivo');
 assert.throws(()=>editAccount(accounts,'10',{name:' ',nature:'Deudora'}),/denominación/);
});
test('no duplica denominaciones normalizadas dentro de la misma cuenta superior',()=>{
 const base=[...official,{code:'101',name:'Caja chica',nature:'Deudora',official:false},{code:'102',name:'Fondos',nature:'Deudora',official:true}];
 assert.throws(()=>addCustomAccount(base,{code:'103',name:'  CÁJA   chica ',nature:'Deudora'}),/denominación/);
 assert.equal(addCustomAccount(base,{code:'1021',name:'Caja chica',nature:'Deudora'}).at(-1).code,'1021');
 assert.throws(()=>addCustomAccount(base.map(x=>x.code==='102'?{...x,active:false}:x),{code:'1021',name:'Nuevo',nature:'Deudora'}),/activa/);
});

test('elimina solo cuentas personalizadas sin asientos ni subcuentas',async()=>{
 const {deleteCustomAccount}=await import('../lib/chart.mjs');
 const base=[{code:'10',name:'Efectivo',nature:'Deudora',official:true},{code:'101',name:'Caja local',nature:'Deudora',official:false},{code:'1011',name:'Subcuenta',nature:'Deudora',official:false}];
 assert.throws(()=>deleteCustomAccount(base,'10'),/personalizadas/);
 assert.throws(()=>deleteCustomAccount(base,'101'),/subcuentas/);
 assert.throws(()=>deleteCustomAccount(base,'1011',[{lines:[{account:'1011'}]}]),/asientos/);
 assert.throws(()=>deleteCustomAccount(base,'1011',[],[{accountCode:'1011'}]),/banco/);
 assert.equal(deleteCustomAccount(base,'1011').some(a=>a.code==='1011'),false);
});
