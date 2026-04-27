import { Prisma } from '../../generated/prisma/client.js';

/** Calcula la comisión según regla activa; sin regla o inactiva => 0. */
export function computeFeeAmountSV(
  _amountBase: Prisma.Decimal,
  _rule: { type: 'FIXED' | 'PERCENTAGE'; value: Prisma.Decimal } | null,
): Prisma.Decimal {
  if (_rule === null) {
    return new Prisma.Decimal(0);
  }
  if (_rule.type === 'FIXED') {
    return _rule.value;
  }
  const PRODUCT = _amountBase.mul(_rule.value).div(100);
  return new Prisma.Decimal(Math.round(Number(PRODUCT.toString())));
}
