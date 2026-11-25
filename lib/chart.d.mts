export type ChartAccount={code:string;name:string;nature:string;official:boolean;active?:boolean;sourceName?:string;modified?:boolean};
export function addCustomAccount(accounts:ChartAccount[],input:{code:string;name:string;nature:string}):ChartAccount[];
export function setAccountActive(accounts:ChartAccount[],code:string,active:boolean):ChartAccount[];
export function mergeReferenceChart(existing:ChartAccount[],reference:{code:string;name:string}[]):ChartAccount[];
export function editAccount(accounts:ChartAccount[],code:string,input:{name:string;nature:string}):ChartAccount[];
