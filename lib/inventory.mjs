/** El valor total se conserva en céntimos; cada salida redondea una sola vez. */
export function moveInventory({quantity,valueCents},kind,units,purchaseValueCents=0) {
  if (!Number.isSafeInteger(quantity)||quantity<0||!Number.isSafeInteger(valueCents)||valueCents<0||!Number.isSafeInteger(units)||units<=0) throw new Error('Las cantidades de inventario deben ser enteros positivos.');
  if (quantity===0 && valueCents!==0) throw new Error('No puede existir valor sin existencias.');
  if (kind==='Compra') {
    if(!Number.isSafeInteger(purchaseValueCents)||purchaseValueCents<0) throw new Error('Valor de compra inválido.');
    const nextValue=valueCents+purchaseValueCents;
    if(!Number.isSafeInteger(nextValue)) throw new Error('Valor de inventario demasiado grande.');
    return {quantity:quantity+units,valueCents:nextValue,movementCents:purchaseValueCents};
  }
  if (kind!=='Venta') throw new Error('Movimiento de inventario desconocido.');
  if (units>quantity) throw new Error('Stock insuficiente.');
  const movementCents=units===quantity?valueCents:Math.round(valueCents*units/quantity);
  return {quantity:quantity-units,valueCents:valueCents-movementCents,movementCents};
}
