import { AppError } from '../errors/app_error.js';

/** Forma mínima de una `TournamentRegistration` requerida para validar su invariante de identidad. */
export interface RegistrationIdentityShape {
  readonly registrationType: 'AUTHENTICATED' | 'GUEST';
  readonly userId: string | null;
  readonly guestName: string | null;
  readonly registeredByUserId: string | null;
}

/**
 * Valida el invariante de identidad de una `TournamentRegistration`.
 * AUTHENTICATED: `userId` debe estar presente y `guestName` debe ser null.
 * GUEST: `userId` debe ser null y `guestName` + `registeredByUserId` deben estar presentes.
 * Función de dominio pura: no depende de infraestructura ni de `_req`.
 * Lanza `AppError` 422 (`INSCRIPCION_INVALIDA`) cuando el invariante se viola.
 */
export function assertRegistrationIdentityInvariantSV(_r: RegistrationIdentityShape): void {
  if (_r.registrationType === 'AUTHENTICATED') {
    if (_r.userId === null) {
      throw new AppError(
        'INSCRIPCION_INVALIDA',
        'Una inscripción autenticada debe tener "userId" definido.',
        422,
      );
    }
    if (_r.guestName !== null) {
      throw new AppError(
        'INSCRIPCION_INVALIDA',
        'Una inscripción autenticada no puede tener datos de invitado.',
        422,
      );
    }
    return;
  }

  if (_r.userId !== null) {
    throw new AppError(
      'INSCRIPCION_INVALIDA',
      'Una inscripción de invitado no puede tener "userId" definido.',
      422,
    );
  }
  if (_r.guestName === null) {
    throw new AppError(
      'INSCRIPCION_INVALIDA',
      'Una inscripción de invitado requiere "guestName".',
      422,
    );
  }
  if (_r.registeredByUserId === null) {
    throw new AppError(
      'INSCRIPCION_INVALIDA',
      'Una inscripción de invitado requiere "registeredByUserId".',
      422,
    );
  }
}
