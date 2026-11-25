/** Reglas mínimas para comprobantes nuevos; los datos anteriores no se reclasifican. */
export function validateVoucher(doc, product){
 if(doc.voucherType===undefined)return true;
 if(!['Factura','Boleta','Recibo por honorarios'].includes(doc.voucherType))throw new Error('Seleccione un tipo de comprobante válido.');
 if(typeof doc.invoiceNumber!=='string'||!doc.invoiceNumber.trim())throw new Error('Ingrese la serie y el número del comprobante.');
 if(doc.voucherType==='Factura'&&doc.kind==='Compra'&&!/^\d{11}$/.test(doc.document||''))throw new Error('Ingrese el RUC del proveedor de la factura.');
 if(doc.kind==='Compra'&&doc.voucherType==='Factura'&&doc.tax==='Gravado'&&typeof doc.taxCreditEligible!=='boolean')throw new Error('Indique si el IGV cumple los requisitos para crédito fiscal.');
 if(doc.voucherType==='Recibo por honorarios'){
  if(doc.kind!=='Compra')throw new Error('Los recibos por honorarios solo están disponibles para compras de servicios.');
  if(!/^\d{11}$/.test(doc.document||''))throw new Error('Ingrese el RUC del prestador del servicio.');
  if(!product||product.type!=='Servicio')throw new Error('El recibo por honorarios requiere un servicio.');
  if(doc.tax!=='Inafecto'||doc.igv!==0)throw new Error('El recibo por honorarios no admite IGV.');
  if(doc.retentionStatus!=='none')throw new Error('Los recibos sujetos a retención aún no se pueden contabilizar automáticamente.');
 }
 if(!['Gravado','Exonerado','Inafecto'].includes(doc.tax))throw new Error('Seleccione una afectación tributaria válida.');
 if(doc.tax!=='Gravado'&&doc.igv!==0)throw new Error('Una operación no gravada no puede tener IGV.');
 return true;
}
export function hasPurchaseTaxCredit(doc){return doc.kind==='Compra'&&doc.voucherType!=='Boleta'&&doc.voucherType!=='Recibo por honorarios'&&doc.taxCreditEligible!==false;}
export function purchaseCost(doc){return hasPurchaseTaxCredit(doc)?doc.base:doc.total;}
