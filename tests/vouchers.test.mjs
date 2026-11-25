import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFromDoc} from '../lib/document-entries.mjs';
import {createSettlement} from '../lib/settlements.mjs';
import {validateVoucher,hasPurchaseTaxCredit,purchaseCost} from '../lib/vouchers.mjs';
import {validateEntry} from '../lib/accounting.mjs';
const service={name:'Asesoría',type:'Servicio',cost:0},goods={name:'Producto',type:'Mercadería',cost:0};
const doc={id:'1',kind:'Compra',date:'2026-11-25',party:'Proveedor',document:'20536557858',invoiceNumber:'F001-1',payment:'Crédito',status:'Contabilizado',voucherType:'Factura',taxCreditEligible:true,tax:'Gravado',base:1000,igv:180,total:1180,qty:1};
test('factura con IGV y boleta sin crédito fiscal mantienen partida doble y costo correcto',()=>{
 const invoice=entryFromDoc(doc,goods);assert.equal(invoice[0].lines[0].debit,1000);assert.equal(invoice[0].lines[1].debit,180);assert.equal(invoice[1].lines[0].debit,1000);
 const noncredit={...doc,taxCreditEligible:false};assert.equal(purchaseCost(noncredit),1180);assert.equal(entryFromDoc(noncredit,goods)[0].lines[1].debit,0);assert.throws(()=>validateVoucher({...doc,taxCreditEligible:undefined},goods),/crédito fiscal/);const ticket={...doc,voucherType:'Boleta'};assert.equal(hasPurchaseTaxCredit(ticket),false);assert.equal(purchaseCost(ticket),1180);const e=entryFromDoc(ticket,goods);assert.equal(e[0].lines[0].debit,1180);assert.equal(e[0].lines[1].debit,0);assert.equal(e[1].lines[0].debit,1180);e.forEach(validateEntry);
});
test('recibo por honorarios sin retención usa cuenta 46 y rechaza IGV, mercadería y retención no implementada',()=>{
 const receipt={...doc,voucherType:'Recibo por honorarios',tax:'Inafecto',retentionStatus:'none',base:1000,igv:0,total:1000};
 const e=entryFromDoc(receipt,service);assert.equal(e[0].lines[2].account,'46');e.forEach(validateEntry);const paid=createSettlement(receipt,[],{id:'p',date:'2026-11-25',amount:1000});assert.equal(paid.entry.lines[0].account,'46');
 assert.throws(()=>validateVoucher({...receipt,retentionStatus:undefined},service),/retención/);assert.throws(()=>validateVoucher({...receipt,igv:180},service),/IGV/);assert.throws(()=>validateVoucher(receipt,goods),/servicio/);assert.throws(()=>validateVoucher({...receipt,kind:'Venta'},service),/compras/);
});
test('datos históricos sin tipo no se alteran y comprobantes nuevos necesitan identificación',()=>{
 assert.equal(validateVoucher({kind:'Compra',igv:0}),true);assert.throws(()=>validateVoucher({...doc,invoiceNumber:''},goods),/serie/);assert.throws(()=>validateVoucher({...doc,document:''},goods),/RUC/);assert.throws(()=>validateVoucher({...doc,tax:'Exonerado'},goods),/IGV/);
});

test('detecta duplicados por serie normalizada y proveedor, sin confundir proveedores distintos',async()=>{
 const {findDuplicateVoucher}=await import('../lib/vouchers.mjs');const old={...doc,id:'old',invoiceNumber:'f001-000123'};
 assert.equal(findDuplicateVoucher({...doc,id:'new',invoiceNumber:' F001-123 '},[old])?.id,'old');
 assert.equal(findDuplicateVoucher({...doc,id:'new',invoiceNumber:'F001-123',document:'20100070970'},[old]),null);
 assert.ok(findDuplicateVoucher({...doc,id:'new',kind:'Venta',invoiceNumber:'F001-123',document:'20100070970'},[{...old,kind:'Venta'}]));
});

test('las facturas de venta ordinarias nuevas requieren RUC; boletas admiten DNI',async()=>{
 const {validateSaleInvoiceIdentity}=await import('../lib/vouchers.mjs');
 const sale={kind:'Venta',voucherType:'Factura',document:'12345678'};
 assert.throws(()=>validateSaleInvoiceIdentity(sale),/RUC de 11/);
 assert.equal(validateSaleInvoiceIdentity({...sale,document:'20100070970'}),true);
 assert.equal(validateSaleInvoiceIdentity({...sale,voucherType:'Boleta'}),true);
});
test('la validación protege nuevas ventas sin bloquear las facturas históricas',async()=>{
 const {validateTransition}=await import('../lib/postgres/validate-transition.mjs');
 const historical={id:'historico',kind:'Venta',voucherType:'Factura',document:'12345678',invoiceNumber:'F001-1'};
 assert.doesNotThrow(()=>validateTransition({docs:[historical]},{docs:[historical]},'admin'));
 assert.throws(()=>validateTransition({docs:[historical]},{docs:[historical,{...historical,id:'nueva',invoiceNumber:'F001-2'}]},'admin'),/RUC de 11/);
 assert.throws(()=>validateTransition({docs:[historical]},{docs:[{...historical,document:'87654321'}]},'admin'),/RUC de 11/);
});

test('recibo de servicios públicos controla RUC, servicio y crédito fiscal',()=>{
 const receipt={...doc,voucherType:'Recibo de servicios públicos'};
 assert.equal(validateVoucher(receipt,service),true);
 assert.throws(()=>validateVoucher({...receipt,document:'12345678'},service),/RUC/);
 assert.throws(()=>validateVoucher(receipt,goods),/servicio/);
 assert.throws(()=>validateVoucher({...receipt,kind:'Venta'},service),/compras/);
 assert.throws(()=>validateVoucher({...receipt,taxCreditEligible:undefined},service),/crédito fiscal/);
 assert.equal(entryFromDoc(receipt,service)[0].lines[1].debit,180);
 assert.equal(entryFromDoc({...receipt,taxCreditEligible:false},service)[0].lines[0].debit,1180);
});

test('recibo 1683 registra alquiler sin IGV y obligación en cuenta 46',async()=>{
 const receipt={...doc,voucherType:'Recibo por arrendamiento 1683',tax:'Inafecto',taxCreditEligible:undefined,base:350,igv:0,total:350};
 assert.equal(validateVoucher(receipt,service),true);
 assert.throws(()=>validateVoucher({...receipt,tax:'Gravado',igv:10},service),/IGV/);
 assert.throws(()=>validateVoucher({...receipt,document:'12345678'},service),/RUC/);
 const entries=entryFromDoc(receipt,service);assert.equal(entries[0].lines.find(x=>x.account==='46').credit,350);
 const paid=createSettlement(receipt,[],{id:'pago',date:'2026-11-25',amount:350});assert.equal(paid.entry.lines[0].account,'46');
});

test('servidor acepta asiento 1683 nuevo y no crea crédito fiscal',async()=>{
 const {validateTransition}=await import('../lib/postgres/validate-transition.mjs');
 const p={id:'alquiler',name:'Alquiler',type:'Servicio',cost:0};
 const receipt={...doc,id:'alquiler-1',productId:p.id,voucherType:'Recibo por arrendamiento 1683',tax:'Inafecto',taxCreditEligible:undefined,base:350,igv:0,total:350};
 const data={docs:[receipt],entries:entryFromDoc(receipt,p),products:[p]};assert.doesNotThrow(()=>validateTransition({docs:[],entries:[]},data,'admin'));assert.equal(hasPurchaseTaxCredit(receipt),false);
});
