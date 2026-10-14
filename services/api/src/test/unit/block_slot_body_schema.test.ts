import { describe, expect, it } from 'vitest';

import { BLOCK_SLOT_BODY_SCHEMA } from '../../presentation/validation/reservations.validation.js';

const COURT_ID = '00000000-0000-4000-8000-000000000001';
const SCHEDULED_AT = '2026-10-04T10:00:00.000Z';

describe('BLOCK_SLOT_BODY_SCHEMA', () => {
  it('should accept a legacy courtId alongside a valid block body', () => {
    const RESULT = BLOCK_SLOT_BODY_SCHEMA.safeParse({
      scheduledAt: SCHEDULED_AT,
      durationMinutes: 60,
      courtId: COURT_ID,
    });

    expect(RESULT.success).toBe(true);
  });

  it('should reject an invalid legacy courtId', () => {
    const RESULT = BLOCK_SLOT_BODY_SCHEMA.safeParse({
      scheduledAt: SCHEDULED_AT,
      durationMinutes: 60,
      courtId: 'not-a-uuid',
    });

    expect(RESULT.success).toBe(false);
  });
});
