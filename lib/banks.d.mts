import type {AccountingEntry} from './accounting.mjs';
export type Bank={id:string;name:string;number:string;accountCode:string};
export type BankMovement={id:string;bankId:string;date:string;kind:'Ingreso'|'Egreso';amount:number;memo:string;reference:string;entryId:string};
type Account={code:string;name:string;active?:boolean};
export function createBankMovement(input:{bank:Bank;account:Account;otherAccount:Account;id:string;date:string;kind:'Ingreso'|'Egreso';amount:number;memo:string;reference?:string;existing?:BankMovement[]}):{movement:BankMovement;entry:AccountingEntry & {id:string;date:string;type:string;memo:string;reference:string}};
export function bankBalance(entries:AccountingEntry[],accountCode:string):number;
