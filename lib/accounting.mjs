/** Operaciones de consulta sobre el diario; importes expresados en soles. */
export function cents(value) {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 100) throw new Error('Importe inválido');
  return Math.round(value * 100);
}
export function totals(lines) {
  return lines.reduce((sum, line) => ({debit:sum.debit+cents(line.debit),credit:sum.credit+cents(line.credit)}),{debit:0,credit:0});
}
export function validateEntry(entry) {
  if (!entry.lines || entry.lines.length < 2) throw new Error('El asiento requiere al menos dos líneas.');
  for (const line of entry.lines) {
    if (!line.account || !Number.isFinite(line.debit) || !Number.isFinite(line.credit) || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0)) throw new Error('Línea contable inválida.');
  }
  const sum=totals(entry.lines);
  if (sum.debit===0 || sum.debit!==sum.credit) throw new Error('El asiento debe tener Debe y Haber iguales.');
  return true;
}
export function validateOpening(entry, existing) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')) throw new Error('Seleccione una fecha válida.');
  if (existing.some(x=>x.type==='Apertura' && x.date.slice(0,4)===entry.date.slice(0,4))) throw new Error('Ya existe un asiento de apertura para este ejercicio.');
  if(entry.lines.some(x=>!['1','2','3','4','5'].includes(x.account[0]))) throw new Error('La apertura solo admite cuentas de activo, pasivo o patrimonio.');
  return validateEntry(entry);
}
export function accountBalances(entries) {
  const balances=new Map();
  for (const entry of entries) for (const line of entry.lines) {
    const old=balances.get(line.account) || {code:line.account,name:line.name,debit:0,credit:0};
    old.debit+=cents(line.debit); old.credit+=cents(line.credit); balances.set(line.account,old);
  }
  return [...balances.values()].map(x=>({...x,balance:x.debit-x.credit}));
}
export function incomeStatement(entries) {
  const rows=accountBalances(entries);
  const net=(prefix)=>rows.filter(x=>x.code.startsWith(prefix)).reduce((sum,x)=>sum+x.credit-x.debit,0);
  const sales=net('70'), cost=-net('69');
  // 61 y 79 compensan cargas por naturaleza; elemento 9 no se suma otra vez.
  const operating=rows.filter(x=>x.code.startsWith('6')&&!x.code.startsWith('69')).reduce((sum,x)=>sum+x.debit-x.credit,0)-net('79');
  const other=rows.filter(x=>x.code.startsWith('7')&&!x.code.startsWith('70')&&!x.code.startsWith('79')).reduce((sum,x)=>sum+x.credit-x.debit,0);
  return {sales:sales/100,cost:cost/100,gross:(sales-cost)/100,operating:operating/100,other:other/100,net:(sales-cost-operating+other)/100};
}
export function position(entries) {
  const rows=accountBalances(entries);
  const sum=(prefixes)=>rows.filter(x=>prefixes.some(p=>x.code.startsWith(p))).reduce((s,x)=>s+x.balance,0);
  const assets=sum(['1','2','3']), liabilities=-sum(['4']), equity=-sum(['5']);
  const result=Math.round(incomeStatement(entries).net*100);
  return {assets:assets/100,liabilities:liabilities/100,equity:equity/100,result:result/100,difference:(assets-liabilities-equity-result)/100};
}

/** Identifica únicamente errores de un céntimo en el IGV de documentos con total incluido. */
export function repairDocumentRounding(documents, entries, closedPeriods=[]) {
  const changes=[];
  const docs=documents.map(doc=>{
    if(doc.status!=='Contabilizado'||doc.tax!=='Gravado'||!doc.included||closedPeriods.includes(doc.date?.slice(0,7)))return doc;
    const matched=entries.filter(e=>e.id===`AS-${doc.id}` || (e.reference===doc.id && e.type===doc.kind));
    if(matched.length!==1)return doc;
    const entry=matched[0], taxLines=entry.lines.filter(l=>l.account==='40');
    if(taxLines.length!==1 || !Number.isFinite(doc.base)||!Number.isFinite(doc.igv)||!Number.isFinite(doc.total))return doc;
    const tax=taxLines[0], expected=cents(doc.total)-cents(doc.base), old=cents(doc.igv);
    if(expected<0 || Math.abs(expected-old)!==1)return doc;
    const sale=doc.kind==='Venta'; if(!sale&&doc.kind!=='Compra')return doc;
    if((sale ? cents(tax.credit)!==old || cents(tax.debit)!==0 : cents(tax.debit)!==old || cents(tax.credit)!==0))return doc;
    const sum=totals(entry.lines);
    if(Math.abs(sum.debit-sum.credit)!==1)return doc;
    const adjusted={...tax,[sale?'credit':'debit']:expected/100};
    const nextEntry={...entry,lines:entry.lines.map(l=>l===tax?adjusted:l)};
    try{validateEntry(nextEntry)}catch{return doc}
    changes.push({entryId:entry.id,documentId:doc.id,entry:nextEntry,previousIgv:doc.igv,correctedIgv:expected/100});
    return {...doc,igv:expected/100};
  });
  return {documents:docs,entries:entries.map(e=>changes.find(c=>c.entryId===e.id)?.entry||e),changes};
}
