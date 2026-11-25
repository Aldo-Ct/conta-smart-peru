import test from 'node:test';
import assert from 'node:assert/strict';
import {LedgerDatabase} from '../lib/ledger-db.mjs';
test('credenciales se almacenan con hash, sesiones expiran y se revocan',()=>{
 const db=new LedgerDatabase(':memory:');db.createCompany('c','Empresa');
 assert.throws(()=>db.createUser({id:'u',company:'c',username:'usuario',password:'corta',role:'admin'}));
 const password='contraseña-larga-de-prueba';
 db.createUser({id:'u',company:'c',username:'usuario',password,role:'admin'});
 const saved=db.db.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').get('u');
 assert.notEqual(saved.password_hash,password);assert.ok(saved.password_salt);
 assert.equal(db.login('usuario','incorrecta',1000),null);
 assert.equal(db.login('desconocido','incorrecta',1000),null);
 const token=db.login('usuario',password,1000);
 assert.equal(db.authenticate(token,1001).role,'admin');
 assert.equal(db.authenticate(token,1000+8*60*60*1000),null);
 db.logout(token);assert.equal(db.authenticate(token,1001),null);db.close();
});
