/** Identifica nombres duplicados dentro de una misma cuenta superior. */
export function normalizedAccountName(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim().replace(/\s+/g,' ');}
export function findSiblingAccount(accounts,code,name){
 const parent=code.length>2?code.slice(0,-1):'';
 return accounts.find(a=>a.code!==code&&a.code.length===code.length&&(code.length===2||a.code.slice(0,-1)===parent)&&normalizedAccountName(a.name)===normalizedAccountName(name));
}
/** Una cuenta personalizada no altera los códigos ya usados en los asientos. */
export function addCustomAccount(accounts,input) {
 const code=String(input.code||'').trim();
 const name=String(input.name||'').trim();
 if(!/^\d{2,12}$/.test(code)) throw new Error('El código debe contener entre 2 y 12 dígitos.');
 if(!name||name.length>150) throw new Error('Ingrese una denominación de hasta 150 caracteres.');
 if(accounts.some(a=>a.code===code)) throw new Error('Ya existe una cuenta con ese código.');
 if(findSiblingAccount(accounts,code,name)) throw new Error('Ya existe una cuenta con esa denominación en el mismo nivel.');
 if(!['Deudora','Acreedora'].includes(input.nature)) throw new Error('Seleccione la naturaleza de la cuenta.');
 if(code.length>2&&!accounts.some(a=>a.code===code.slice(0,-1)&&a.active!==false)) throw new Error('Primero debe existir y estar activa la cuenta superior inmediata.');
 return [...accounts,{code,name,nature:input.nature,official:false,active:true}];
}
export function setAccountActive(accounts,code,active) {
 if(!accounts.some(a=>a.code===code)) throw new Error('La cuenta no existe.');
 return accounts.map(a=>a.code===code?{...a,active}:a);
}
export function mergeReferenceChart(existing,reference) {
 const result=existing.map(a=>({...a}));
 const codes=new Set(existing.map(a=>a.code));
 for(const entry of reference) if(!codes.has(entry.code)) {
   result.push({code:entry.code,name:entry.name,nature:'Sin configurar',official:true,sourceName:entry.name,active:true});
   codes.add(entry.code);
 }
 return result;
}
export function editAccount(accounts,code,input) {
 const name=String(input.name||'').trim();
 if(!name||name.length>150) throw new Error('Ingrese una denominación de hasta 150 caracteres.');
 if(!['Deudora','Acreedora','Sin configurar'].includes(input.nature)) throw new Error('Naturaleza inválida.');
 if(!accounts.some(a=>a.code===code)) throw new Error('La cuenta no existe.');
 return accounts.map(a=>a.code===code?{...a,name,nature:input.nature,modified:true}:a);
}
