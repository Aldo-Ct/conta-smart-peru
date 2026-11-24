"use client";
import {useState} from 'react';
export type InventoryMovement={id:string;date:string;productId:string;productName:string;kind:'Compra'|'Venta';quantity:number;movementCents:number;balanceQuantity:number;balanceCents:number};
const money=(x:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(x/100);
export default function Kardex({movements}:{movements:InventoryMovement[]}) {
 const [query,setQuery]=useState('');
 const filtered=movements.filter(x=>x.productName.toLowerCase().includes(query.toLowerCase()));
 return <><div className="title"><div><h1>Kardex valorizado</h1><p>Movimientos registrados desde la activación del promedio móvil.</p></div></div><div className="toolbar"><div className="search"><input value={query} placeholder="Buscar producto" onChange={e=>setQuery(e.target.value)}/></div></div><div className="card tablewrap"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Operación</th><th>Cantidad</th><th>Valor movimiento</th><th>Existencia</th><th>Valor saldo</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td>{x.date.split('-').reverse().join('/')}</td><td>{x.productName}</td><td>{x.kind}</td><td>{x.quantity}</td><td>{money(x.movementCents)}</td><td>{x.balanceQuantity}</td><td>{money(x.balanceCents)}</td></tr>)}{!filtered.length&&<tr><td colSpan={7} className="empty">No hay movimientos registrados en el Kardex nuevo.</td></tr>}</tbody></table></div><p className="hint">Los saldos anteriores se toman como punto de partida; no se reconstruyen movimientos históricos automáticamente.</p></>;
}
