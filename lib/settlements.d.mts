import type { AccountingEntry } from './accounting.mjs';
export type Settlement={id:string;documentId:string;date:string;amount:number};
export type SettlementDocument={id:string;date:string;kind:'Venta'|'Compra';party:string;total:number;payment:'Contado'|'Crédito';status:'Contabilizado'|'Borrador'|'Anulado'};
export function remainingBalance(document:SettlementDocument,settlements:Settlement[]):number;
export function createSettlement(document:SettlementDocument,settlements:Settlement[],input:{id:string;date:string;amount:number}):{settlement:Settlement;entry:AccountingEntry & {id:string;date:string;type:string;memo:string;reference:string}};
