import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
const good={accounts:[],products:[],docs:[{id:'d1',kind:'Venta',date:'2026-01-01',payment:'Crédito',status:'Contabilizado',base:100,igv:18,total:118}],entries:[{id:'AS-d1',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:100}]}]};
test('valida asientos y rechaza duplicados antes de guardar',()=>{
 assert.equal(validateSnapshot(good),true);
 assert.throws(()=>validateSnapshot({...good,docs:[good.docs[0],good.docs[0]]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[good.entries[0],good.entries[0]]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[{id:'a',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:99}]}]}),/iguales/);
});

test('rechaza existencias negativas y pagos superiores',()=>{assert.throws(()=>validateSnapshot({...good,products:[{id:'p',stock:-1,cost:1,price:1}]}),/existencias/);assert.throws(()=>validateSnapshot({...good,settlements:[{id:'s',documentId:'d1',date:'2026-01-02',amount:119}],entries:[...good.entries,{id:'AS-s',reference:'d1',lines:[{account:'10',debit:119,credit:0},{account:'12',debit:0,credit:119}]}]}),/excede/);assert.throws(()=>validateSnapshot({...good,docs:[{...good.docs[0],total:-1}]}),/Importes/)});
