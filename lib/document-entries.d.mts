import type {AccountingEntry} from './accounting.mjs';
type Doc={id:string;kind:'Venta'|'Compra';date:string;party:string;invoiceNumber?:string;payment:'Contado'|'Crédito';total:number;igv:number;base:number;qty:number};
type Product={name:string;type:'Mercadería'|'Servicio';cost:number};
export function entryFromDoc(doc:Doc,product?:Product):Array<AccountingEntry & {id:string;date:string;type:string;memo:string;reference:string}>;
