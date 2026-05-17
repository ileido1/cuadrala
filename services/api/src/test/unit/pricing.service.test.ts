import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { assertValidPricingTimeRangeSV } from '../../domain/services/booking/pricing.service.js';

describe('assertValidPricingTimeRangeSV', () => {
  it('should pass when startTime is before endTime', () => {
    expect(() => assertValidPricingTimeRangeSV('08:00', '12:00')).not.toThrow();
  });

  it('should throw HORA_INVALIDA when startTime is not before endTime', () => {
    expect(() => assertValidPricingTimeRangeSV('14:00', '10:00')).toThrow(AppError);
    expect(() => assertValidPricingTimeRangeSV('10:00', '10:00')).toThrow(AppError);
  });
});
