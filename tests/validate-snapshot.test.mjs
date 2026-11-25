import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
const good={accounts:[],products:[],docs:[{id:'d1',kind:'Venta',date:'2026-01-01',payment:'Crédito',status:'Contabilizado',base:100,igv:18,total:118}],entries:[{id:'AS-d1',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:100}]}]};
test('valida asientos y rechaza duplicados antes de guardar',()=>{
 assert.equal(validateSnapshot(good),true);
 assert.throws(()=>validateSnapshot({...good,docs:[good.docs[0],good.docs[0]]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[good.entries[0],good.entries[0]]}),/duplicado/);
 assert.throws(()=>validateSnapshot({...good,entries:[{id:'a',lines:[{account:'10',debit:100,credit:0},{account:'50',debit:0,credit:99}]}]}),/iguales/);
});

test('rechaza existencias negativas y pagos superiores',()=>{assert.throws(()=>validateSnapshot({...good,products:[{id:'p',stock:-1,cost:1,price:1}]}),/existencias/);assert.throws(()=>validateSnapshot({...good,settlements:[{id:'s',documentId:'d1',date:'2026-01-02',amount:119}],entries:[...good.entries,{id:'AS-s',reference:'d1',lines:[{account:'10',debit:119,credit:0},{account:'12',debit:0,credit:119}]}]}),/excede/);assert.throws(()=>validateSnapshot({...good,docs:[{...good.docs[0],total:-1}]}),/Importes/)});
test('valida la vinculación entre movimiento bancario y asiento',()=>{
 const bank={id:'b',name:'Banco',number:'001',accountCode:'1041'};const movement={id:'m',bankId:'b',date:'2026-11-01',kind:'Ingreso',amount:20,memo:'Depósito',entryId:'AS-m'};const entry={id:'AS-m',date:'2026-11-01',lines:[{account:'1041',debit:20,credit:0},{account:'101',debit:0,credit:20}]};const data={accounts:[{code:'1041'}],products:[],docs:[],entries:[entry],bankAccounts:[bank],bankMovements:[movement]};assert.equal(validateSnapshot(data),true);assert.throws(()=>validateSnapshot({...data,bankMovements:[{...movement,amount:30}]}),/no coincide/);assert.throws(()=>validateSnapshot({...data,bankAccounts:[bank,bank]}),/duplicada/);
});
test('evita reutilizar extractos o movimientos en conciliación',()=>{
 const bank={id:'b',name:'Banco',number:'001',accountCode:'1041'},movement={id:'m',bankId:'b',date:'2026-11-01',kind:'Ingreso',amount:20,memo:'Depósito',entryId:'AS-m'},entry={id:'AS-m',date:'2026-11-01',lines:[{account:'1041',debit:20,credit:0},{account:'101',debit:0,credit:20}]},statement={id:'s',bankId:'b',date:'2026-11-01',kind:'Ingreso',amount:20,memo:'Abono',reference:'OP-1'},match={statementId:'s',movementId:'m'},data={accounts:[{code:'1041'}],products:[],docs:[],entries:[entry],bankAccounts:[bank],bankMovements:[movement],bankStatements:[statement],bankMatches:[match]};assert.equal(validateSnapshot(data),true);assert.throws(()=>validateSnapshot({...data,bankMatches:[match,match]}),/duplicada/);
});
test('cheque anulado debe conservar la reversión exacta',async()=>{
 const {issueCheque,transitionCheque}=await import('../lib/cheques.mjs');const bank={id:'b',name:'Banco',number:'001',accountCode:'1041'},account={code:'1041',name:'Banco'},otherAccount={code:'42',name:'Proveedor'};const r=issueCheque({bank,account,otherAccount,id:'q',number:'123',beneficiary:'Proveedor',date:'2026-11-01',amount:20,memo:'Pago'});const reversed=transitionCheque(r.cheque,'Anulado','2026-11-02',[r.entry]);const data={accounts:[account],products:[],docs:[],entries:[r.entry,reversed.reversal],bankAccounts:[bank],bankMovements:[r.movement],bankCheques:[reversed.cheque]};assert.equal(validateSnapshot(data),true);assert.throws(()=>validateSnapshot({...data,entries:[r.entry]}),/reversión/);
});
test('valida cobros bancarios vinculados al documento, asiento y movimiento',async()=>{
 const {createSettlement}=await import('../lib/settlements.mjs');const bank={id:'b',name:'Banco',number:'001',accountCode:'1041'};const r=createSettlement(good.docs[0],[],{id:'new',date:'2026-01-02',amount:40,bank,reference:'OP-1'});const data={...good,accounts:[{code:'1041'}],entries:[...good.entries,r.entry],settlements:[r.settlement],bankAccounts:[bank],bankMovements:[r.movement]};assert.equal(validateSnapshot(data),true);assert.throws(()=>validateSnapshot({...data,bankMovements:[]}),/movimiento bancario/);
});
