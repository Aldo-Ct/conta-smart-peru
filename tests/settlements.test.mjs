import test from 'node:test';
import assert from 'node:assert/strict';
import {createSettlement,remainingBalance} from '../lib/settlements.mjs';
const doc={id:'F01',date:'2026-01-10',kind:'Venta',party:'Cliente',total:1180,payment:'Crédito',status:'Contabilizado'};
test('cobranza parcial y total se reflejan en saldo y asientos',()=>{
 const first=createSettlement(doc,[],{id:'C1',date:'2026-01-11',amount:400});
 assert.equal(remainingBalance(doc,[first.settlement]),780);
 assert.deepEqual(first.entry.lines.map(l=>[l.account,l.debit,l.credit]),[['101',400,0],['12',0,400]]);
 const second=createSettlement(doc,[first.settlement],{id:'C2',date:'2026-01-12',amount:780});
 assert.equal(remainingBalance(doc,[first.settlement,second.settlement]),0);
});
test('pago de proveedor y protección ante errores',()=>{
 const purchase={...doc,kind:'Compra'};
 const payment=createSettlement(purchase,[],{id:'P1',date:'2026-01-11',amount:100});
 assert.deepEqual(payment.entry.lines.map(l=>[l.account,l.debit,l.credit]),[['42',100,0],['101',0,100]]);
 assert.throws(()=>createSettlement(doc,[payment.settlement],{id:'P1',date:'2026-01-11',amount:10}),/ya fue/);
 assert.throws(()=>createSettlement(doc,[],{id:'P2',date:'2026-01-09',amount:10}),/fecha/);
 assert.throws(()=>createSettlement(doc,[],{id:'P2',date:'2026-01-11',amount:1180.01}),/supera/);
 assert.throws(()=>createSettlement(doc,[],{id:'P2',date:'2026-01-11',amount:1.001}),/decimales/);
});
test('pago total queda cancelado, genera asiento vinculado y rechaza fecha imposible',()=>{
 const purchase={...doc,kind:'Compra',invoiceNumber:'F001-123'};
 const paid=createSettlement(purchase,[],{id:'P-total',date:'2026-01-31',amount:1180});
 assert.equal(remainingBalance(purchase,[paid.settlement]),0);
 assert.equal(paid.entry.reference,purchase.id);assert.match(paid.entry.memo,/F001-123/);
 assert.throws(()=>createSettlement(purchase,[],{id:'bad-date',date:'2026-02-30',amount:10}),/fecha válida/);
 assert.throws(()=>createSettlement(purchase,[paid.settlement],{id:'over',date:'2026-02-01',amount:0.01}),/supera/);
});

test('pago por banco vincula asiento y movimiento y rechaza referencia duplicada',()=>{
 const bank={id:'b1',name:'Banco',number:'123',accountCode:'1041'};
 const result=createSettlement({...doc,kind:'Compra'},[],{id:'P3',date:'2026-01-11',amount:100,bank,reference:'TR-123'});
 assert.equal(result.entry.lines[1].account,'1041');assert.equal(result.movement.entryId,result.entry.id);assert.equal(result.movement.kind,'Egreso');
 assert.throws(()=>createSettlement(doc,[],{id:'P4',date:'2026-01-11',amount:10,bank,reference:'tr-123',existingMovements:[result.movement]}),/referencia bancaria/i);
});
