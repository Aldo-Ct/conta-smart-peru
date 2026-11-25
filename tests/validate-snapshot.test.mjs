import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
const good={accounts:[],products:[],docs:[{id:'d1'}],entries:[{id:'a1',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:100}]}]};
test('valida asientos y rechaza duplicados antes de guardar',()=>{
 assert.equal(validateSnapshot(good),true);
 assert.throws(()=>validateSnapshot({...good,docs:[{id:'d1'},{id:'d1'}]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[good.entries[0],good.entries[0]]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[{id:'a',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:99}]}]}),/iguales/);
});
