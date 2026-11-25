import {validateEntry} from './accounting.mjs';
const rounded=n=>Math.round((n+Number.EPSILON)*100)/100;
/** Genera asientos para el flujo existente. La clasificación del servicio es general. */
export function entryFromDoc(d,product){
 const sale=d.kind==='Venta',receivable=sale?'12':'42',cash='10';
 const purchaseAccount=product?.type==='Servicio'?'63':'60';
 const lines=sale?[{account:receivable,name:'Cuentas por cobrar comerciales',debit:d.total,credit:0},{account:'40',name:'IGV por pagar',debit:0,credit:d.igv},{account:'70',name:'Ventas',debit:0,credit:d.base}]:[{account:purchaseAccount,name:purchaseAccount==='63'?'Gastos de servicios prestados por terceros':'Compras',debit:d.base,credit:0},{account:'40',name:'IGV crédito fiscal',debit:d.igv,credit:0},{account:receivable,name:'Cuentas por pagar comerciales',debit:0,credit:d.total}];
 const arr=[{id:`AS-${d.id}`,date:d.date,type:d.kind,memo:`${d.kind} ${d.party}${d.invoiceNumber?` · ${d.invoiceNumber}`:''}`,reference:d.id,lines}];
 if(d.payment==='Contado')arr.push({id:`COB-${d.id}`,date:d.date,type:sale?'Cobranza':'Pago',memo:`${d.kind} al contado · ${d.party}`,reference:d.id,lines:sale?[{account:cash,name:'Caja y bancos',debit:d.total,credit:0},{account:receivable,name:'Cuentas por cobrar',debit:0,credit:d.total}]:[{account:receivable,name:'Cuentas por pagar',debit:d.total,credit:0},{account:cash,name:'Caja y bancos',debit:0,credit:d.total}]});
 if(!sale&&product?.type==='Mercadería')arr.push({id:`DES-${d.id}`,date:d.date,type:'Destino',memo:`Destino de ${product.name} · ${d.party}`,reference:d.id,lines:[{account:'20',name:'Mercaderías',debit:d.base,credit:0},{account:'61',name:'Variación de existencias',debit:0,credit:d.base}]});
 if(sale&&product?.type==='Mercadería')arr.push({id:`COS-${d.id}`,date:d.date,type:'Costo de venta',memo:`Costo de ${product.name} · ${d.party}`,reference:d.id,lines:[{account:'69',name:'Costo de ventas',debit:rounded(product.cost*d.qty),credit:0},{account:'20',name:'Mercaderías',debit:0,credit:rounded(product.cost*d.qty)}]});
 arr.forEach(validateEntry);return arr;
}
