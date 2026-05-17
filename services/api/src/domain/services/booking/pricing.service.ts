import { AppError } from '../../errors/app_error.js';

/** Valida que startTime < endTime en formato HH:MM. */
export function assertValidPricingTimeRangeSV(_startTime: string, _endTime: string): void {
  if (_startTime >= _endTime) {
    throw new AppError(
      'HORA_INVALIDA',
      'La hora de inicio debe ser menor que la hora de fin.',
      400,
    );
  }
}
