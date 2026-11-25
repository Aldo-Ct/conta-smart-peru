import test from 'node:test';
import assert from 'node:assert/strict';
import {createContaPool} from '../lib/postgres/connection.mjs';
test('la conexión requiere credenciales y se restringe a la base separada',async()=>{
 assert.throws(()=>createContaPool({host:'host',user:'user',password:'secret',database:'aldoct-database'}),/configuración/);
 assert.throws(()=>createContaPool({host:'host',user:'user',database:'conta_smart'}),/configuración/);
 const pool=createContaPool({host:'host',user:'user',password:'secret',database:'conta_smart'});
 assert.equal(pool.options.database,'conta_smart');assert.equal(pool.options.ssl.rejectUnauthorized,true);await pool.end();
});
