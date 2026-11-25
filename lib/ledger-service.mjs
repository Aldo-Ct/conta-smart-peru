/** Servicio aislado: exige sesión y obtiene la empresa desde el usuario autenticado. */
export class LedgerService {
  constructor(database){this.database=database;}
  user(token,roles){
    const user=this.database.authenticate(token);
    if(!user)throw new Error('Sesión inválida o vencida.');
    if(roles&&!roles.includes(user.role))throw new Error('No tiene permiso para esta operación.');
    return user;
  }
  entries(token){const user=this.user(token);return this.database.listEntries(user.company_id);}
  lines(token){const user=this.user(token);return this.database.listLines(user.company_id);}
  post(token,input){
    const user=this.user(token,['admin','accountant']);
    if(!input||typeof input!=='object')throw new Error('Asiento inválido.');
    this.database.post({...input,company:user.company_id});
  }
  reverse(token,input){
    const user=this.user(token,['admin','accountant']);
    if(!input||typeof input!=='object')throw new Error('Reversión inválida.');
    this.database.reverse({...input,company:user.company_id});
  }
  setPeriod(token,month,closed){
    const user=this.user(token,['admin']);
    if(typeof closed!=='boolean')throw new Error('Estado de periodo inválido.');
    this.database.setPeriod(user.company_id,month,closed);
  }
}
