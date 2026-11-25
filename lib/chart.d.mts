export type ChartAccount={code:string;name:string;nature:string;official:boolean;active?:boolean};
export function addCustomAccount(accounts:ChartAccount[],input:{code:string;name:string;nature:string}):ChartAccount[];
export function setAccountActive(accounts:ChartAccount[],code:string,active:boolean):ChartAccount[];
