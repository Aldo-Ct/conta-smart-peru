/** Validación para ventas nacionales ordinarias nuevas; no modifica comprobantes históricos. */
export function validateSaleInvoiceIdentity(doc){
 if(doc.kind==='Venta'&&doc.voucherType==='Factura'&&!/^\d{11}$/.test(doc.document||''))throw new Error('Para una factura de venta ingrese el RUC de 11 dígitos del cliente. Si corresponde una boleta, seleccione Boleta y use su serie y número.');
 return true;
}
/** Reglas mínimas para comprobantes nuevos; los datos anteriores no se reclasifican. */
export function validateVoucher(doc, product){
 if(doc.voucherType===undefined)return true;
 if(!['Factura','Boleta','Recibo por honorarios','Recibo de servicios públicos'].includes(doc.voucherType))throw new Error('Seleccione un tipo de comprobante válido.');
 if(typeof doc.invoiceNumber!=='string'||!doc.invoiceNumber.trim())throw new Error('Ingrese la serie y el número del comprobante.');
 if(doc.voucherType==='Factura'&&doc.kind==='Compra'&&!/^\d{11}$/.test(doc.document||''))throw new Error('Ingrese el RUC del proveedor de la factura.');
 if(doc.voucherType==='Recibo de servicios públicos'){if(doc.kind!=='Compra')throw new Error('Los recibos de servicios públicos solo están disponibles en compras.');if(!/^\d{11}$/.test(doc.document||''))throw new Error('Ingrese el RUC del proveedor del servicio público.');if(!product||product.type!=='Servicio')throw new Error('Seleccione un servicio para el recibo de servicios públicos.');}
 if(doc.kind==='Compra'&&['Factura','Recibo de servicios públicos'].includes(doc.voucherType)&&doc.tax==='Gravado'&&typeof doc.taxCreditEligible!=='boolean')throw new Error('Indique si el IGV cumple los requisitos para crédito fiscal.');
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

/** Normaliza una serie y un número sin alterar el comprobante original. */
export function voucherNumberKey(value){
 const text=String(value||'').trim().toUpperCase().replace(/\s+/g,'');
 const match=text.match(/^([A-Z0-9]+)-(\d+)$/);
 return match?`${match[1]}-${match[2].replace(/^0+(?=\d)/,'')}`:text;
}
export function findDuplicateVoucher(doc,documents){
 const number=voucherNumberKey(doc.invoiceNumber);if(!number)return null;
 const party=String(doc.document||'').trim()||String(doc.party||'').trim().toLocaleUpperCase();
 return documents.find(other=>{
  if(other.id===doc.id||other.kind!==doc.kind||voucherNumberKey(other.invoiceNumber)!==number)return false;
  if(other.voucherType&&doc.voucherType&&other.voucherType!==doc.voucherType)return false;
  if(doc.kind==='Venta')return true;
  const otherParty=String(other.document||'').trim()||String(other.party||'').trim().toLocaleUpperCase();
  return !!party&&party===otherParty;
 })||null;
}
