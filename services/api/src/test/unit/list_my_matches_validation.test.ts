import { describe, it, expect } from 'vitest';
import { LIST_MY_MATCHES_QUERY_SCHEMA } from '../../presentation/validation/matches.validation.js';

describe('LIST_MY_MATCHES_QUERY_SCHEMA', () => {
  it('accepts empty query with defaults', () => {
    const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({});
    expect(RESULT.page).toBe(1);
    expect(RESULT.limit).toBe(20);
    expect(RESULT.status).toBeUndefined();
    expect(RESULT.role).toBeUndefined();
    expect(RESULT.scheduledFrom).toBeUndefined();
    expect(RESULT.scheduledTo).toBeUndefined();
  });

  it('accepts valid status enum value', () => {
    const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({ status: 'SCHEDULED' });
    expect(RESULT.status).toBe('SCHEDULED');
  });

  it('accepts all valid status values', () => {
    const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const;
    for (const STATUS of STATUSES) {
      const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({ status: STATUS });
      expect(RESULT.status).toBe(STATUS);
    }
  });

  it('accepts valid role values', () => {
    for (const ROLE of ['CREATOR', 'PARTICIPANT', 'ANY'] as const) {
      const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({ role: ROLE });
      expect(RESULT.role).toBe(ROLE);
    }
  });

  it('rejects invalid status string', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ status: 'UNKNOWN' }),
    ).toThrow();
  });

  it('rejects non-numeric limit', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ limit: 'abc' }),
    ).toThrow();
  });

  it('rejects limit above 100', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ limit: '101' }),
    ).toThrow();
  });

  it('rejects page below 1', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ page: '0' }),
    ).toThrow();
  });

  it('accepts valid ISO datetime for scheduledFrom', () => {
    const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({
      scheduledFrom: '2026-06-01T00:00:00+00:00',
    });
    expect(RESULT.scheduledFrom).toBe('2026-06-01T00:00:00+00:00');
  });

  it('rejects invalid datetime for scheduledFrom', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ scheduledFrom: 'not-a-date' }),
    ).toThrow();
  });

  it('coerces page and limit from string', () => {
    const RESULT = LIST_MY_MATCHES_QUERY_SCHEMA.parse({ page: '2', limit: '10' });
    expect(RESULT.page).toBe(2);
    expect(RESULT.limit).toBe(10);
  });

  it('rejects unknown extra fields (strict)', () => {
    expect(() =>
      LIST_MY_MATCHES_QUERY_SCHEMA.parse({ unknownField: 'value' }),
    ).toThrow();
  });
});
