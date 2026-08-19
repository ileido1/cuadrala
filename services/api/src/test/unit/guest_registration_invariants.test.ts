import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { assertRegistrationIdentityInvariantSV } from '../../domain/tournament/guest_registration_invariants.js';

describe('assertRegistrationIdentityInvariantSV', () => {
  it('accepts a valid AUTHENTICATED registration (userId set, guest fields null)', () => {
    expect(() =>
      assertRegistrationIdentityInvariantSV({
        registrationType: 'AUTHENTICATED',
        userId: 'user-1',
        guestName: null,
        registeredByUserId: null,
      }),
    ).not.toThrow();
  });

  it('accepts a valid GUEST registration (userId null, guestName + registeredByUserId set)', () => {
    expect(() =>
      assertRegistrationIdentityInvariantSV({
        registrationType: 'GUEST',
        userId: null,
        guestName: 'Carlos',
        registeredByUserId: 'organizer-1',
      }),
    ).not.toThrow();
  });

  it('rejects AUTHENTICATED with userId null', () => {
    let caught: unknown;
    try {
      assertRegistrationIdentityInvariantSV({
        registrationType: 'AUTHENTICATED',
        userId: null,
        guestName: null,
        registeredByUserId: null,
      });
    } catch (_error) {
      caught = _error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INSCRIPCION_INVALIDA');
    expect((caught as AppError).statusCode).toBe(422);
  });

  it('rejects AUTHENTICATED with guestName set', () => {
    let caught: unknown;
    try {
      assertRegistrationIdentityInvariantSV({
        registrationType: 'AUTHENTICATED',
        userId: 'user-1',
        guestName: 'Carlos',
        registeredByUserId: null,
      });
    } catch (_error) {
      caught = _error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INSCRIPCION_INVALIDA');
  });

  it('rejects GUEST with userId set', () => {
    let caught: unknown;
    try {
      assertRegistrationIdentityInvariantSV({
        registrationType: 'GUEST',
        userId: 'user-1',
        guestName: 'Carlos',
        registeredByUserId: 'organizer-1',
      });
    } catch (_error) {
      caught = _error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INSCRIPCION_INVALIDA');
  });

  it('rejects GUEST with guestName null', () => {
    let caught: unknown;
    try {
      assertRegistrationIdentityInvariantSV({
        registrationType: 'GUEST',
        userId: null,
        guestName: null,
        registeredByUserId: 'organizer-1',
      });
    } catch (_error) {
      caught = _error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INSCRIPCION_INVALIDA');
  });

  it('rejects GUEST with registeredByUserId null', () => {
    let caught: unknown;
    try {
      assertRegistrationIdentityInvariantSV({
        registrationType: 'GUEST',
        userId: null,
        guestName: 'Carlos',
        registeredByUserId: null,
      });
    } catch (_error) {
      caught = _error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INSCRIPCION_INVALIDA');
  });
});
