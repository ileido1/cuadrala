import { describe, expect, it } from 'vitest';
import {
  asReservationId,
  asTransactionId,
  type ReservationId,
  type TransactionId,
} from '../../domain/value_objects/identifiers.js';

describe('identifiers', () => {
  it('should wrap string ids with as* helpers', () => {
    const RESERVATION_ID: ReservationId = asReservationId(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    const TRANSACTION_ID: TransactionId = asTransactionId(
      '223e4567-e89b-12d3-a456-426614174001',
    );
    expect(RESERVATION_ID).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(TRANSACTION_ID).toBe('223e4567-e89b-12d3-a456-426614174001');
  });
});
