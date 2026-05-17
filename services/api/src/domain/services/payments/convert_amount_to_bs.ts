/** Convierte monto mayor a centavos BS (legacy; MCP reemplazará con MoneyConversionService). */
export function convertAmountToBsSV(
  _amount: number,
  _currency: string,
  _rateToBs: number,
): number {
  if (_currency === 'BS') {
    return Math.round(_amount * 100);
  }
  return Math.round(_amount * _rateToBs * 100);
}
