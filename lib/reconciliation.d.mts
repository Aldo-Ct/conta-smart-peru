import type {BankMovement} from './banks.mjs';
export type BankStatement={id:string;bankId:string;date:string;kind:'Ingreso'|'Egreso';amount:number;reference:string;memo:string};
export type BankMatch={statementId:string;movementId:string};
export function uniqueReconciliationSuggestions(bankId:string,statements:BankStatement[],movements:BankMovement[],matches:BankMatch[]):BankMatch[];
export function validateStatement(input:BankStatement,existing:BankStatement[]):BankStatement;
