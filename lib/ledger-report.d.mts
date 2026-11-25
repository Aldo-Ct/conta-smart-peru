import type {Entry,Line} from '../app/AccountingTools';
export function ledgerForPeriod(entries:Entry[],account:string,from?:string,to?:string):{opening:number;debit:number;credit:number;closing:number;rows:{entry:Entry;line:Line;index:number;balance:number}[]};
