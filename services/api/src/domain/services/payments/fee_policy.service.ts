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

/** Comisión en minor units (VenueFeeRule: FIXED en minor, % sobre base minor). */
export function computeFeeMinorSV(
  _baseMinor: bigint,
  _rule: FeeRuleInput & { source: 'VENUE' | 'GLOBAL' },
): bigint {
  if (_rule.source === 'GLOBAL') {
    const FEE_MAJOR = computeFeeAmountSV(Number(_baseMinor) / 100, _rule);
    return BigInt(Math.round(FEE_MAJOR * 100));
  }
  if (_rule.type === 'FIXED') {
    return BigInt(Math.round(_rule.value));
  }
  return (_baseMinor * BigInt(Math.round(_rule.value)) + 50n) / 100n;
}

/** Fee en unidades mayores para obligaciones legacy (amountTotal Decimal). */
export function computeObligationFeeSV(
  _amountBaseMajor: number,
  _rule: (FeeRuleInput & { source: 'VENUE' | 'GLOBAL' }) | null,
): number {
  if (_rule === null) {
    return 0;
  }
  const BASE_MINOR = BigInt(Math.round(_amountBaseMajor * 100));
  const FEE_MINOR = computeFeeMinorSV(BASE_MINOR, _rule);
  return Number(FEE_MINOR) / 100;
}
