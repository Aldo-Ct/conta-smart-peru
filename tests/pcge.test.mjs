import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rows=JSON.parse(readFileSync(new URL('../lib/pcge-2010.json',import.meta.url),'utf8'));
test('catálogo sin duplicados y con jerarquía completa',()=>{
 const codes=new Set(rows.map(x=>x.code));
 assert.equal(rows.length,1792);
 assert.equal(codes.size,rows.length);
 for(const row of rows){assert.match(row.code,/^\d{2,5}$/);assert.ok(row.name.trim());if(row.code.length>2)assert.ok(codes.has(row.code.slice(0,-1)),row.code);}
});
test('muestras del documento y elemento 9 sin códigos inventados',()=>{
 const names=new Map(rows.map(x=>[x.code,x.name]));
 assert.equal(names.get('101'),'Caja');
 assert.equal(names.get('1041'),'Cuentas corrientes operativas');
 assert.equal(names.get('0121'),'Cartas fianza');
 assert.equal(names.has('90'),false);
});
