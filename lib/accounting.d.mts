export type AccountingLine={account:string;name:string;debit:number;credit:number};
export type AccountingEntry={lines:AccountingLine[]};
export function cents(value:number):number;
export function totals(lines:AccountingLine[]):{debit:number;credit:number};
export function validateEntry(entry:AccountingEntry):true;
export function validateOpening(entry:AccountingEntry & {date:string}, existing:{type:string;date:string}[]):true;
export function accountBalances(entries:AccountingEntry[]):{code:string;name:string;debit:number;credit:number;balance:number}[];
export function incomeStatement(entries:AccountingEntry[]):{sales:number;cost:number;gross:number;operating:number;other:number;net:number};
export function position(entries:AccountingEntry[]):{assets:number;liabilities:number;equity:number;result:number;difference:number};
