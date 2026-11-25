import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordRecord,PostgresAuth} from '../lib/postgres/auth.mjs';
test('contraseña derivada, sesión aleatoria y token guardado como hash',async()=>{
 const pass='una-contraseña-segura',record=await passwordRecord(pass),calls=[];
 const pool={async query(sql,args){calls.push({sql,args});if(sql.startsWith('SELECT id,'))return {rows:[{id:'u',password_salt:record.salt,password_hash:record.hash,active:true}]};if(sql.startsWith('SELECT u.id'))return {rows:[{id:'u',company_id:'empresa',role:'admin'}]};return {rows:[]}}};
 const auth=new PostgresAuth(pool);assert.equal(await auth.login('usuario','incorrecto'),null);const token=await auth.login('USUARIO',pass);assert.equal(token.length,43);assert.notEqual(calls.at(-1).args[0],token);assert.equal((await auth.authenticate(token)).company_id,'empresa');await auth.logout(token);assert.notEqual(calls.at(-1).args[0],token);assert.equal(await auth.authenticate('mal'),null);await assert.rejects(passwordRecord('corta'),/contraseña/i);
});
