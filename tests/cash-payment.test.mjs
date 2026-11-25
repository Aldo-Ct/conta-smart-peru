import test from 'node:test';
import assert from 'node:assert/strict';
import {createCashPayment} from '../lib/cash-payment.mjs';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
const banks=[{id:'b',name:'BCP',number:'123',accountCode:'104'}];
const accounts=[{code:'101',name:'Caja'},{code:'104',name:'Banco'}];
const base={id:'d',kind:'Venta',date:'2026-11-25',party:'Cliente',payment:'Contado',paymentMethod:'Transferencia',bankId:'b',paymentReference:'OP1',total:118,base:100,igv:18,status:'Contabilizado'};
for(const kind of ['Venta','Compra'])test(`${kind} al contado por transferencia vincula banco y asiento`,()=>{
 const doc={...base,kind};const {entry,movement}=createCashPayment(doc,banks,accounts,[]);assert.equal(entry.lines.find(l=>l.account==='104')[kind==='Venta'?'debit':'credit'],118);assert.equal(movement.entryId,entry.id);
 const original={id:'AS-d',date:doc.date,type:kind,reference:'d',lines:[{account:'10',debit:118,credit:0},{account:'50',debit:0,credit:118}]};const snapshot={accounts,products:[],docs:[doc],entries:[original,entry],bankAccounts:banks,bankMovements:[movement]};assert.equal(validateSnapshot(snapshot),true);assert.throws(()=>validateSnapshot({...snapshot,bankMovements:[]}),/transferencia/);
});
test('efectivo usa caja y transferencia exige referencia única',()=>{
 const cash=createCashPayment({...base,paymentMethod:'Efectivo',bankId:undefined,paymentReference:undefined},banks,accounts,[]);assert.equal(cash.entry.lines[0].account,'101');assert.equal(cash.movement,undefined);
 assert.throws(()=>createCashPayment({...base,paymentReference:''},banks,accounts,[]),/número/);assert.throws(()=>createCashPayment(base,banks,accounts,[{bankId:'b',reference:'op1'}]),/registrado/);
});
