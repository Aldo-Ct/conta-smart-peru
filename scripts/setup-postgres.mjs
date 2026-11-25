import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createContaPool} from '../lib/postgres/connection.mjs';
import {passwordRecord} from '../lib/postgres/auth.mjs';
const {CONTA_DB_HOST:host,CONTA_DB_USER:user,CONTA_DB_PASSWORD:password,CONTA_ADMIN_USERNAME:username,CONTA_ADMIN_PASSWORD:adminPassword,CONTA_COMPANY_NAME:companyName}=process.env;
if(!username||username.trim().length<3||username.length>100||!companyName?.trim())throw new Error('Configure el usuario administrador y nombre de empresa.');
const record=await passwordRecord(adminPassword);
const pool=createContaPool({host,user,password,database:'conta_smart'}),client=await pool.connect();
try{
 await client.query('BEGIN');
 await client.query(await readFile(new URL('../lib/postgres/schema.sql',import.meta.url),'utf8'));
 await client.query('SELECT pg_advisory_xact_lock(8302941)');
 const existing=await client.query('SELECT count(*)::int AS count FROM users');
 if(existing.rows[0].count!==0)throw new Error('Ya existen usuarios; no se modificó ninguna cuenta.');
 const companyId=randomUUID(),userId=randomUUID();
 await client.query('INSERT INTO companies(id,name) VALUES ($1,$2)',[companyId,companyName.trim()]);
 await client.query('INSERT INTO users(id,company_id,username,password_salt,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6)',[userId,companyId,username.trim().toLowerCase(),record.salt,record.hash,'admin']);
 await client.query('COMMIT');process.stdout.write('Base inicializada correctamente.\n');
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
