/** Una cuenta personalizada no altera los códigos ya usados en los asientos. */
export function addCustomAccount(accounts,input) {
 const code=String(input.code||'').trim();
 const name=String(input.name||'').trim();
 if(!/^\d{2,12}$/.test(code)) throw new Error('El código debe contener entre 2 y 12 dígitos.');
 if(!name||name.length>150) throw new Error('Ingrese una denominación de hasta 150 caracteres.');
 if(accounts.some(a=>a.code===code)) throw new Error('Ya existe una cuenta con ese código.');
 if(!['Deudora','Acreedora'].includes(input.nature)) throw new Error('Seleccione la naturaleza de la cuenta.');
 if(code.length>2&&!accounts.some(a=>a.code===code.slice(0,-1))) throw new Error('Primero debe existir la cuenta superior inmediata.');
 return [...accounts,{code,name,nature:input.nature,official:false,active:true}];
}
export function setAccountActive(accounts,code,active) {
 if(!accounts.some(a=>a.code===code)) throw new Error('La cuenta no existe.');
 return accounts.map(a=>a.code===code?{...a,active}:a);
}
