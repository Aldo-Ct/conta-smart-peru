import type {Bank,BankMovement} from './banks.mjs';
import type {AccountingEntry} from './accounting.mjs';
type Doc={id:string;kind:'Venta'|'Compra';date:string;party:string;payment:'Contado'|'Crédito';paymentMethod?:'Efectivo'|'Transferencia';bankId?:string;paymentReference?:string;voucherType?:string;total:number};
export function createCashPayment(doc:Doc,banks:Bank[],accounts:{code:string;name:string;active?:boolean}[],movements:BankMovement[]):{entry:AccountingEntry & {id:string;date:string;type:string;memo:string;reference:string};movement?:BankMovement};
