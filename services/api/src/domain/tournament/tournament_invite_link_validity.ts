import { AppError } from '../errors/app_error.js';
import type { TournamentInviteLinkDTO } from '../ports/tournament_invite_link_repository.js';

/**
 * Valida que un `TournamentInviteLink` sea usable en este instante.
 * Función de dominio pura: no depende de infraestructura ni de `_req`.
 * Orden de chequeo (REQ-TIL-003/004/005): expirado, revocado, agotado.
 */
export function assertTournamentInviteLinkUsableSV(_link: TournamentInviteLinkDTO): void {
  //? 1. Expirado (REQ-TIL-003)
  if (_link.expiresAt.getTime() <= Date.now()) {
    throw new AppError('ENLACE_INVALIDO', 'El enlace de invitación ya no es válido.', 410);
  }

  //? 2. Revocado (REQ-TIL-005)
  if (_link.revokedAt !== null) {
    throw new AppError('ENLACE_REVOCADO', 'El enlace de invitación fue revocado.', 409);
  }

  //? 3. Usos agotados (REQ-TIL-004)
  if (_link.maxUses !== null && _link.usesCount >= _link.maxUses) {
    throw new AppError('ENLACE_AGOTADO', 'El enlace de invitación agotó sus usos.', 409);
  }
}
