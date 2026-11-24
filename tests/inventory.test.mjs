import test from 'node:test';
import assert from 'node:assert/strict';
import {moveInventory} from '../lib/inventory.mjs';
test('promedio móvil conserva valor y registra costo de salida',()=>{
 const purchase=moveInventory({quantity:10,valueCents:100000},'Compra',10,200000);
 assert.equal(purchase.valueCents,300000);
 const sale=moveInventory(purchase,'Venta',4);
 assert.equal(sale.movementCents,60000);
 assert.equal(sale.quantity,16);
 assert.equal(sale.valueCents,240000);
});
test('agotamiento elimina el residuo de redondeo y bloquea stock negativo',()=>{
 const initial={quantity:3,valueCents:100};
 const first=moveInventory(initial,'Venta',1);
 const rest=moveInventory(first,'Venta',2);
 assert.equal(first.movementCents+rest.movementCents,100);
 assert.deepEqual([rest.quantity,rest.valueCents],[0,0]);
 assert.throws(()=>moveInventory(rest,'Venta',1),/Stock insuficiente/);
 assert.throws(()=>moveInventory(initial,'Compra',0,100));
});
