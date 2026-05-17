import { describe, it, expect } from 'vitest';
import { convertAmountToBsSV } from '../../../domain/services/payments/convert_amount_to_bs.js';

describe('convertAmountToBsSV', () => {
  it('should convert BS currency directly to cents', () => {
    const result = convertAmountToBsSV(100, 'BS', 1);
    expect(result).toBe(10000); // 100 * 100 = 10000 cents
  });

  it('should convert BS with decimal amounts correctly', () => {
    const result = convertAmountToBsSV(50.5, 'BS', 1);
    expect(result).toBe(5050); // 50.5 * 100 = 5050 cents
  });

  it('should convert USD to BS using exchange rate', () => {
    const result = convertAmountToBsSV(100, 'USD', 50); // 100 USD * 50 = 5000 BS -> 500000 cents
    expect(result).toBe(500000);
  });

  it('should convert EUR to BS using exchange rate', () => {
    const result = convertAmountToBsSV(25, 'EUR', 55); // 25 EUR * 55 = 1375 BS -> 137500 cents
    expect(result).toBe(137500);
  });

  it('should handle small amounts with rounding', () => {
    const result = convertAmountToBsSV(0.5, 'USD', 50); // 0.5 * 50 = 25 BS -> 2500 cents
    expect(result).toBe(2500);
  });

  it('should round to nearest integer (banker rounding off)', () => {
    // Math.round(12.5) = 13 in JS
    const result = convertAmountToBsSV(0.125, 'USD', 100); // 0.125 * 100 = 12.5 -> 1250 cents
    expect(result).toBe(1250);
  });

  it('should return 0 for zero amount', () => {
    const result = convertAmountToBsSV(0, 'BS', 1);
    expect(result).toBe(0);
  });

  it('should return 0 for zero amount with currency conversion', () => {
    const result = convertAmountToBsSV(0, 'USD', 50);
    expect(result).toBe(0);
  });

  it('should handle large amounts correctly', () => {
    const result = convertAmountToBsSV(10000, 'USD', 50); // 10000 * 50 = 500000 BS -> 50000000 cents
    expect(result).toBe(50000000);
  });
});