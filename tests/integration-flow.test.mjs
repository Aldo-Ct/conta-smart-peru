import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFromDoc} from '../lib/document-entries.mjs';
import {moveInventory} from '../lib/inventory.mjs';
import {createSettlement,remainingBalance} from '../lib/settlements.mjs';
import {accountBalances,totals} from '../lib/accounting.mjs';
import {ledgerForPeriod} from '../lib/ledger-report.mjs';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
import {validateTransition} from '../lib/postgres/validate-transition.mjs';

test('simula compra a crédito, destino, venta a crédito, costo y pagos parciales hasta cancelación',()=>{
 let p={id:'p',name:'Mercadería',type:'Mercadería',stock:0,cost:0,price:1180,inventoryValueCents:0};
 const purchase={id:'compra',kind:'Compra',date:'2026-10-01',party:'Proveedor',document:'20100070970',invoiceNumber:'F001-101',voucherType:'Factura',taxCreditEligible:true,tax:'Gravado',payment:'Crédito',status:'Contabilizado',base:1000,igv:180,total:1180,qty:10,productId:p.id};
 let movement=moveInventory({quantity:0,valueCents:0},'Compra',10,100000);p={...p,stock:movement.quantity,inventoryValueCents:movement.valueCents,cost:100};
 const purchaseEntries=entryFromDoc(purchase,p);assert.deepEqual(purchaseEntries.map(e=>e.type),['Compra','Destino']);
 const sale={...purchase,id:'venta',kind:'Venta',date:'2026-11-01',party:'Cliente',invoiceNumber:'F002-101',qty:1};
 movement=moveInventory({quantity:p.stock,valueCents:p.inventoryValueCents},'Venta',1,100000);const saleEntries=entryFromDoc(sale,{...p,cost:movement.movementCents/100});p={...p,stock:movement.quantity,inventoryValueCents:movement.valueCents};
 assert.deepEqual(saleEntries.map(e=>e.type),['Venta','Costo de venta']);assert.equal(p.stock,9);assert.equal(p.inventoryValueCents,90000);
 const s1=createSettlement(purchase,[],{id:'pago-1',date:'2026-11-02',amount:500});const s2=createSettlement(purchase,[s1.settlement],{id:'pago-2',date:'2026-11-03',amount:680});assert.equal(remainingBalance(purchase,[s1.settlement,s2.settlement]),0);
 const cob=createSettlement(sale,[],{id:'cobro-1',date:'2026-11-04',amount:180});assert.equal(remainingBalance(sale,[cob.settlement]),1000);
 const entries=[...purchaseEntries,...saleEntries,s1.entry,s2.entry,cob.entry],data={accounts:[],products:[p],docs:[purchase,sale],entries,settlements:[s1.settlement,s2.settlement,cob.settlement]};
 assert.equal(validateSnapshot(data),true);const sums=totals(entries.flatMap(e=>e.lines));assert.equal(sums.debit,sums.credit);const balances=accountBalances(entries);assert.equal(balances.find(x=>x.code==='20').balance,90000);assert.equal(balances.find(x=>x.code==='42').balance,0);assert.equal(balances.find(x=>x.code==='12').balance,100000);
 const mayor=ledgerForPeriod(entries,'12','2026-11-01','2026-11-30');assert.equal(mayor.closing,100000);assert.equal(mayor.rows.length,2);
 const duplicate={...purchase,id:'repetida',invoiceNumber:'f001-000101'};assert.throws(()=>validateTransition(data,{...data,docs:[...data.docs,duplicate]},'admin'),/comprobante/);
});
