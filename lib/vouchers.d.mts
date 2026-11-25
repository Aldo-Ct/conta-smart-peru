export function validateVoucher(doc:{voucherType?:string;kind:string;invoiceNumber?:string;document?:string;tax?:string;igv:number;retentionStatus?:string;taxCreditEligible?:boolean},product?:{type:string}):true;
export function hasPurchaseTaxCredit(doc:{kind:string;voucherType?:string;taxCreditEligible?:boolean}):boolean;
export function purchaseCost(doc:{kind:string;voucherType?:string;taxCreditEligible?:boolean;base:number;total:number}):number;
