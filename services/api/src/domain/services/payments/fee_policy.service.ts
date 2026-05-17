/**
 * Política de comisión en dominio (sin IO).
 * Sustituye `domain/monetization/fee_calculation.ts` para Wave 0.
 */

export type FeeRuleInput = {
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
} | null;

/** Calcula la comisión según regla activa; sin regla o inactiva => 0. */
export function computeFeeAmountSV(
  _amountBase: number,
  _rule: FeeRuleInput,
): number {
  if (_rule === null) {
    return 0;
  }
  if (_rule.type === 'FIXED') {
    return _rule.value;
  }
  const PRODUCT = (_amountBase * _rule.value) / 100;
  return Math.round(PRODUCT);
}
