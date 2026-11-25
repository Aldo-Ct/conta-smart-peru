import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LedgerDatabase} from '../lib/ledger-db.mjs';
const line=(account,debit,credit)=>({account,debit,credit});
test('diario persiste, mantiene partida doble y revierte una sola vez',()=>{
 const dir=mkdtempSync(join(tmpdir(),'conta-ledger-'));
 try{
  const file=join(dir,'ledger.db');let db=new LedgerDatabase(file);
  db.createCompany('c1','Empresa');db.addAccount('c1','10','Caja');db.addAccount('c1','50','Capital');
  db.post({id:'a1',company:'c1',operationKey:'documento-1',date:'2026-01-01',memo:'Aporte',lines:[line('10',1000,0),line('50',0,1000)]});
  assert.throws(()=>db.post({id:'fake',company:'c1',operationKey:'fake',date:'2026-01-02',memo:'Falsa reversión',reversesId:'a1',lines:[line('10',1,0),line('50',0,1)]}),/invertir exactamente/);
  assert.throws(()=>db.post({id:'a2',company:'c1',operationKey:'documento-1',date:'2026-01-01',memo:'Duplicado',lines:[line('10',1,0),line('50',0,1)]}));
  assert.throws(()=>db.post({id:'a3',company:'c1',operationKey:'doc-3',date:'2026-01-01',memo:'Falla',lines:[line('10',1,0),line('99',0,1)]}),/Cuenta/);
  assert.equal(db.listEntries('c1').length,1);assert.equal(db.listLines('c1').length,2);
  db.close();db=new LedgerDatabase(file);assert.equal(db.listEntries('c1').length,1);
  db.setPeriod('c1','2026-02',true);
  assert.throws(()=>db.reverse({company:'c1',originalId:'a1',id:'r1',operationKey:'rev-1',date:'2026-02-01',memo:'Reversión'}),/cerrado/);
  db.setPeriod('c1','2026-02',false);db.reverse({company:'c1',originalId:'a1',id:'r1',operationKey:'rev-1',date:'2026-02-01',memo:'Reversión'});
  assert.throws(()=>db.reverse({company:'c1',originalId:'a1',id:'r2',operationKey:'rev-2',date:'2026-02-02',memo:'Otra reversión'}));
  const lines=db.listLines('c1');assert.equal(lines.reduce((n,l)=>n+l.debit_cents-l.credit_cents,0),0);assert.equal(lines.length,4);db.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('rechaza fechas imposibles, fracciones de céntimo y asientos descuadrados',()=>{
 const db=new LedgerDatabase(':memory:');db.createCompany('c','Empresa');db.addAccount('c','10','Caja');db.addAccount('c','50','Capital');
 const base={id:'a',company:'c',operationKey:'k',date:'2026-01-01',memo:'Prueba'};
 assert.throws(()=>db.post({...base,date:'2026-02-30',lines:[line('10',1,0),line('50',0,1)]}),/Fecha/);
 assert.throws(()=>db.post({...base,lines:[line('10',1.001,0),line('50',0,1.001)]}),/decimales/);
 assert.throws(()=>db.post({...base,lines:[line('10',1,0),line('50',0,2)]}),/cuadrado/);
 assert.equal(db.listEntries('c').length,0);db.close();
});
