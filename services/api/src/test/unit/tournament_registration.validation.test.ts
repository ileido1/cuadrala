import { describe, expect, it } from 'vitest';

import { CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA } from '../../presentation/validation/tournament_registration.validation.js';

describe('CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA', () => {
  it('accepts an empty body because the authenticated actor is the participant', () => {
    expect(CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA.parse({})).toEqual({});
  });

  it('rejects a client-supplied userId', () => {
    expect(() =>
      CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA.parse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).toThrow();
  });
});
