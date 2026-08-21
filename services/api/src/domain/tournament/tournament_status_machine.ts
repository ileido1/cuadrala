import { AppError } from '../errors/app_error.js';

/**
 * Bordes legales de transición de estado de un torneo (tabla estática).
 * DRAFT   -> OPEN, CANCELLED
 * OPEN    -> IN_PROGRESS, CANCELLED
 * IN_PROGRESS -> COMPLETED
 * COMPLETED / CANCELLED -> (estados terminales, sin transiciones salientes)
 */
const LEGAL_TOURNAMENT_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Valida que la transición de estado `_from -> _to` sea legal según la tabla de bordes.
 * Función de dominio pura: no depende de infraestructura ni de `_req`.
 * Lanza `AppError` 409 (`ESTADO_INVALIDO`) cuando la transición no está permitida.
 */
export function assertTournamentTransitionSV(_from: string, _to: string): void {
  const ALLOWED_TARGETS = LEGAL_TOURNAMENT_TRANSITIONS[_from];

  if (ALLOWED_TARGETS === undefined || !ALLOWED_TARGETS.includes(_to)) {
    throw new AppError(
      'ESTADO_INVALIDO',
      `Transición de estado inválida: no se puede pasar de ${_from} a ${_to}.`,
      409,
    );
  }
}
