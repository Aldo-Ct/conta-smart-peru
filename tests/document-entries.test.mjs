import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFromDoc} from '../lib/document-entries.mjs';
import {incomeStatement,validateEntry} from '../lib/accounting.mjs';
const base={id:'X',date:'2026-01-10',party:'Tercero',payment:'Crédito',total:1180,base:1000,igv:180,qty:1};
test('venta de mercadería genera ingreso y costo sin cancelar crédito',()=>{const entries=entryFromDoc({...base,kind:'Venta'},{name:'Bien',type:'Mercadería',cost:600});assert.deepEqual(entries.map(x=>x.type),['Venta','Costo de venta']);assert.equal(incomeStatement(entries).gross,400);entries.forEach(validateEntry)});
test('compra de servicio usa 63 y mercadería usa 60 con destino',()=>{const service=entryFromDoc({...base,kind:'Compra'},{name:'Servicio',type:'Servicio',cost:0});assert.equal(service[0].lines[0].account,'63');assert.equal(service.length,1);const goods=entryFromDoc({...base,kind:'Compra'},{name:'Bien',type:'Mercadería',cost:0});assert.equal(goods[0].lines[0].account,'60');assert.equal(goods[1].type,'Destino');goods.forEach(validateEntry)});
