import type {Bank,BankMovement} from './banks.mjs';import type {AccountingEntry} from './accounting.mjs';
type Account={code:string;name:string;active?:boolean};
export type Cheque={id:string;bankId:string;number:string;beneficiary:string;date:string;amount:number;memo:string;status:'Pendiente'|'Cobrado'|'Anulado'|'Rechazado';movementId:string;history:{date:string;status:string}[]};
type Entry=AccountingEntry & {id:string;date:string;type:string;memo:string;reference:string};
export function issueCheque(input:{bank:Bank;account:Account;otherAccount:Account;id:string;number:string;beneficiary:string;date:string;amount:number;memo:string;cheques?:Cheque[];movements?:BankMovement[]}):{cheque:Cheque;movement:BankMovement;entry:Entry};
export function transitionCheque(cheque:Cheque,status:'Cobrado'|'Anulado'|'Rechazado',date:string,entries:(AccountingEntry & {id:string;date:string;type:string;memo:string;reference?:string})[],matches?:{movementId:string}[]):{cheque:Cheque;reversal:Entry|null};
