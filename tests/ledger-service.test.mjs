import test from 'node:test';
import assert from 'node:assert/strict';
import {LedgerDatabase} from '../lib/ledger-db.mjs';
import {LedgerService} from '../lib/ledger-service.mjs';

test('sesiones, roles y separación de empresas se aplican a diario y periodos',()=>{
 const db=new LedgerDatabase(':memory:');
 try {
  db.createCompany('a','Empresa A');db.createCompany('b','Empresa B');
  for(const c of ['a','b']){db.addAccount(c,'10','Caja');db.addAccount(c,'50','Capital');}
  for(const [id,company,role] of [['admin','a','admin'],['contador','a','accountant'],['lector','a','viewer'],['otro','b','admin']])db.createUser({id,company,username:id,password:'contraseña-segura-123',role});
  const service=new LedgerService(db), token=name=>db.login(name,'contraseña-segura-123');
  const admin=token('admin'),contador=token('contador'),lector=token('lector'),otro=token('otro');
  const entry={id:'entry-a',company:'b',operationKey:'x',date:'2026-01-01',memo:'Aporte',lines:[{account:'10',debit:10,credit:0},{account:'50',debit:0,credit:10}]};
  assert.throws(()=>service.post(lector,entry),/permiso/);
  assert.throws(()=>service.entries('sesion-falsa'),/Sesión/);
  service.post(contador,entry);
  assert.equal(service.entries(lector).length,1);assert.equal(service.entries(otro).length,0);
  assert.throws(()=>service.setPeriod(contador,'2026-01',true),/permiso/);
  service.setPeriod(admin,'2026-01',true);
  assert.throws(()=>service.post(contador,{...entry,id:'nuevo',operationKey:'nuevo'}),/cerrado/);
  db.logout(lector);assert.throws(()=>service.lines(lector),/Sesión/);
 } finally {db.close();}
});
