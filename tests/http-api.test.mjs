import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createContaApi} from '../lib/postgres/http-api.mjs';
import {SnapshotConflict} from '../lib/postgres/snapshots.mjs';
const token='a'.repeat(43),origin='https://www.aldoct.tech';
test('API protege origen, sesión, roles y conflictos de escritura',async()=>{
 const auth={async login(u,p){return u==='admin'&&p==='correcta'?token:null},async authenticate(t){return t===token?{id:'u',company_id:'c',role:'admin',username:'admin'}:null},async logout(){}};
 const store={async load(){return {revision:1,data:{}}},async save(){throw new SnapshotConflict()}};
 const api=createContaApi({auth,store,allowedOrigins:[origin]}),server=createServer((req,res)=>api(req,res));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  const request=(path,options={})=>fetch(url+path,options);
  let r=await request('/api/conta/login',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{}'});assert.equal(r.status,403);
  r=await request('/api/conta/data');assert.equal(r.status,401);
  r=await request('/api/conta/login',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({username:'admin',password:'correcta'})});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
  r=await request('/api/conta/data',{headers:{cookie}});assert.equal(r.status,200);
  r=await request('/api/conta/data',{method:'PUT',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({revision:1,data:{}})});assert.equal(r.status,409);
 }finally{await new Promise(r=>server.close(r));}
});
