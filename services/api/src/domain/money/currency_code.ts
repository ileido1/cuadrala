import { InvalidCurrencyCodeError } from './money_errors.js';

export const CURRENCY_CODES = ['BS', 'USD', 'EUR'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export function isCurrencyCode(_value: string): _value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(_value);
}

export function parseCurrencyCode(_value: string): CurrencyCode {
  if (!isCurrencyCode(_value)) {
    throw new InvalidCurrencyCodeError(_value);
  }
  return _value;
}
