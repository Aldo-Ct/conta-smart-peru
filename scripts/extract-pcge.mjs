// Extracción mecánica del catálogo (páginas impresas 16–67) del PDF facilitado.
// Requiere: pdftotext -layout archivo.pdf archivo.txt
import {readFileSync,writeFileSync} from 'node:fs';
const input=process.argv[2], output=process.argv[3];
if(!input||!output) throw new Error('Uso: node scripts/extract-pcge.mjs texto.txt salida.json');
const text=readFileSync(input,'utf8');
const begin=text.indexOf('ELEMENTO 1:       ACTIVO DISPONIBLE Y EXIGIBLE',text.indexOf('ORDENADO POR ELEMENTO'));
const end=text.indexOf('PARTE III - DESCRIPCIÓN Y DINÁMICA CONTABLE',begin);
if(begin<0||end<0) throw new Error('No se encontró el catálogo esperado.');
const rows=[];
for(const line of text.slice(begin,end).split('\n')) {
  const match=line.match(/^\s*(\d{2,5})\s{1,}([^\d\s].*?)\s*$/);
  if(match) {rows.push({code:match[1],name:match[2].trim()});continue;}
  const s=line.trim();
  if(!s||/^\d+$/.test(s)||/^ELEMENTO\b/.test(s)||/^CUENTAS DE ORDEN/.test(s)||/^El uso de las cuentas/.test(s)||/^acuerdo con la clasificación/.test(s)||/^procesos productivos/.test(s)||/^producción y gastos por función/i.test(s)) continue;
  if(rows.length && /^\s{4,}\S/.test(line)) rows[rows.length-1].name+=' '+s;
}
const seen=new Set();
for(const row of rows){if(seen.has(row.code)) throw new Error(`Código duplicado: ${row.code}`);seen.add(row.code);}
const missing=rows.filter(x=>x.code.length>2&&!seen.has(x.code.slice(0,-1)));
if(missing.length) throw new Error(`Faltan cuentas superiores: ${missing.map(x=>x.code).join(', ')}`);
writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
console.log(`Extraídas ${rows.length} cuentas; sin duplicados ni padres faltantes.`);
