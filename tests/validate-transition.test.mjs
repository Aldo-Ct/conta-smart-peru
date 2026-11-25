import test from 'node:test';import assert from 'node:assert/strict';import {validateTransition} from '../lib/postgres/validate-transition.mjs';
test('protege periodos cerrados de edición y reapertura sin permiso',()=>{const entry={id:'a',date:'2026-10-01',memo:'original'},old={closedPeriods:['2026-10'],entries:[entry]};assert.doesNotThrow(()=>validateTransition(old,{closedPeriods:['2026-10'],entries:[entry]},'accountant'));assert.throws(()=>validateTransition(old,{closedPeriods:[],entries:[entry]},'accountant'),/administrador/);assert.throws(()=>validateTransition(old,{closedPeriods:[],entries:[{...entry,memo:'cambio'}]},'admin'),/modificar/);assert.throws(()=>validateTransition(old,{closedPeriods:['2026-10'],entries:[entry,{id:'b',date:'2026-10-03'}]},'admin'),/agregar/);assert.doesNotThrow(()=>validateTransition(old,{closedPeriods:[],entries:[entry]},'admin'));});
test('no permite eliminar cheques ni modificar su historial',()=>{const c={id:'q',bankId:'b',number:'1',beneficiary:'P',date:'2026-10-01',amount:10,memo:'Pago',movementId:'m',status:'Pendiente',history:[{date:'2026-10-01',status:'Pendiente'}]},old={closedPeriods:[],entries:[],bankCheques:[c]};assert.throws(()=>validateTransition(old,{...old,bankCheques:[]},'admin'),/eliminar/);assert.throws(()=>validateTransition(old,{...old,bankCheques:[{...c,amount:20}]},'admin'),/modificar/);const updated={...c,status:'Cobrado',history:[...c.history,{date:'2026-11-01',status:'Cobrado'}]};assert.doesNotThrow(()=>validateTransition(old,{...old,bankCheques:[updated]},'admin'))});
test('rechaza un duplicado nuevo sin bloquear datos históricos existentes',()=>{const d={id:'1',kind:'Compra',voucherType:'Factura',invoiceNumber:'F001-0001',document:'20100070970',party:'Proveedor'},old={docs:[d],entries:[],closedPeriods:[]};const duplicate={...d,id:'2',invoiceNumber:'f001-1'};assert.throws(()=>validateTransition(old,{...old,docs:[d,duplicate]},'admin'),/comprobante/);assert.doesNotThrow(()=>validateTransition(old,{...old,docs:[d,{...duplicate,document:'20536557858'}]},'admin'));const legacy={...old,docs:[d,duplicate]};assert.doesNotThrow(()=>validateTransition(legacy,legacy,'admin'))});

test('protege comprobantes y asientos registrados contra eliminación',()=>{
 const before={docs:[{id:'d',status:'Contabilizado'}],entries:[{id:'AS-d'}]};
 assert.throws(()=>validateTransition(before,{docs:[],entries:before.entries},'admin'),/eliminar un comprobante/);
 assert.throws(()=>validateTransition(before,{docs:before.docs,entries:[]},'admin'),/eliminar un asiento/);
});
test('valida asiento y movimiento de inventario de una nueva compra',async()=>{
 const {entryFromDoc}=await import('../lib/document-entries.mjs');
 const p={id:'p',name:'Papel',type:'Mercadería',cost:10},doc={id:'d',kind:'Compra',date:'2026-11-25',party:'Proveedor',payment:'Crédito',status:'Contabilizado',productId:'p',qty:1,tax:'Gravado',base:100,igv:18,total:118};
 const entries=entryFromDoc(doc,p),movement={id:'d',date:doc.date,kind:'Compra',quantity:1,productId:'p',productName:'Papel',movementCents:10000,balanceCents:10000,balanceQuantity:1};
 const next={docs:[doc],entries,products:[p],inventoryMovements:[movement]};assert.doesNotThrow(()=>validateTransition({docs:[],entries:[]},next,'admin'));
 const bad={...entries[0],lines:[{account:'10',debit:1,credit:0},{account:'50',debit:0,credit:1}]};assert.throws(()=>validateTransition({docs:[],entries:[]},{...next,entries:[bad,...entries.slice(1)]},'admin'),/asiento no coincide/);
 assert.throws(()=>validateTransition({docs:[],entries:[]},{...next,inventoryMovements:[{...movement,quantity:2}]},'admin'),/inventario/);
});

test('el servidor rechaza subcuentas nuevas duplicadas sin bloquear las anteriores',()=>{
 const root={code:'10',name:'Efectivo',nature:'Deudora',official:true},a={code:'101',name:'Caja chica',nature:'Deudora',official:false};
 const old={accounts:[root,a],docs:[],entries:[]};assert.doesNotThrow(()=>validateTransition(old,old,'admin'));
 const duplicate={code:'102',name:'CAJA CHICA',nature:'Deudora',official:false};assert.throws(()=>validateTransition(old,{...old,accounts:[...old.accounts,duplicate]},'admin'),/denominación/);
 const other={...duplicate,name:'Cuenta operativa'};assert.doesNotThrow(()=>validateTransition(old,{...old,accounts:[...old.accounts,other]},'admin'));
});
test('el servidor impide crear otro registro con código ya existente',()=>{
 const account={code:'10',name:'Efectivo',nature:'Deudora',official:true},old={accounts:[account],docs:[],entries:[]};
 assert.throws(()=>validateTransition(old,{...old,accounts:[account,{...account,official:false}]},'admin'),/código/);
});

test('el servidor solo permite borrar cuentas personalizadas sin referencias',()=>{
 const official={code:'10',name:'Efectivo',nature:'Deudora',official:true},custom={code:'101',name:'Personalizada',nature:'Deudora',official:false};
 const before={accounts:[official,custom],entries:[],docs:[]};
 assert.doesNotThrow(()=>validateTransition(before,{...before,accounts:[official]},'admin'));
 assert.throws(()=>validateTransition(before,{...before,accounts:[custom]},'admin'),/personalizadas/);
 const entry={id:'a',lines:[{account:'101'}]};assert.throws(()=>validateTransition({...before,entries:[entry]},{...before,entries:[entry],accounts:[official]},'admin'),/asientos/);
});
