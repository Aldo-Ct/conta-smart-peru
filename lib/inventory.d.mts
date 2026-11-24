export function moveInventory(stock:{quantity:number;valueCents:number},kind:'Compra'|'Venta',units:number,purchaseValueCents?:number):{quantity:number;valueCents:number;movementCents:number};
