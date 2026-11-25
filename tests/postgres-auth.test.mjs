import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordRecord,PostgresAuth} from '../lib/postgres/auth.mjs';
test('contraseña derivada, sesión aleatoria y token guardado como hash',async()=>{
 const pass='una-contraseña-segura',record=await passwordRecord(pass),calls=[];
 const pool={async query(sql,args){calls.push({sql,args});if(sql.startsWith('SELECT id,'))return {rows:[{id:'u',password_salt:record.salt,password_hash:record.hash,active:true,role:'admin'}]};if(sql.startsWith('SELECT u.id'))return {rows:[{id:'u',company_id:'empresa',role:'admin'}]};return {rows:[]}}};
 const auth=new PostgresAuth(pool);assert.equal(await auth.login('admin','incorrecto'),null);const token=await auth.login('ADMIN',pass);assert.equal(token.length,43);assert.notEqual(calls.at(-1).args[0],token);assert.equal((await auth.authenticate(token)).company_id,'empresa');await auth.logout(token);assert.notEqual(calls.at(-1).args[0],token);assert.equal(await auth.authenticate('mal'),null);await assert.rejects(passwordRecord('corta'),/contraseña/i);
});

test('solo admin con rol admin puede iniciar sesión; las sesiones se limitan a admin',async()=>{
 const record=await passwordRecord('una-contraseña-segura');let role='admin',sessionSql='';
 const pool={async query(sql){if(sql.startsWith('SELECT id,'))return {rows:[{id:'u',password_salt:record.salt,password_hash:record.hash,active:true,role}]};if(sql.startsWith('SELECT u.id')){sessionSql=sql;return {rows:[]}}return {rows:[]}}};
 const auth=new PostgresAuth(pool);assert.equal(await auth.login('otro','una-contraseña-segura'),null);role='accountant';assert.equal(await auth.login('admin','una-contraseña-segura'),null);await auth.authenticate('a'.repeat(43));assert.match(sessionSql,/u.username='admin'/);assert.match(sessionSql,/u.role='admin'/);
});
