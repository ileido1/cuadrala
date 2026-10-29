import { AppError } from '../../domain/errors/app_error.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type {
  TournamentRegistrationDTO,
  TournamentRegistrationRepository,
} from '../../domain/ports/tournament_registration_repository.js';

export type RegisterGuestForTournamentCoreInput = {
  tournament: {
    id: string;
    status: string;
    isCompetitive: boolean;
    inscriptionPrice: number | null;
    maxSlots: number | null;
  };
  guestName: string;
  guestPhone?: string | null;
  guestEmail: string;
  registeredByUserId: string;
  inviteLinkId?: string | null;
};

/**
 * Cuerpo de negocio compartido para dar de alta un invitado (GUEST) a un
 * torneo: roster-open (REQ-TIL-009), restricción "competitivo + inscripción
 * con costo no admite invitados" (confirmado por el usuario el 2026-10-28
 * que también aplica al registro vía link), cupos agotados (REQ-TIL-010) y
 * el alta en sí (`createGuestSV`).
 *
 * Extraído de `InviteGuestTournamentParticipantUseCase` para que
 * `RegisterViaTournamentInviteLinkUseCase` lo reuse sin heredar el chequeo
 * de autoridad de ese caso de uso (ver design.md, decisión #1).
 */
export async function registerGuestForTournamentCoreSV(
  _input: RegisterGuestForTournamentCoreInput,
  _registrationRepository: TournamentRegistrationRepository,
): Promise<TournamentRegistrationDTO> {
  //? 1. El roster se bloquea desde IN_PROGRESS; invitar invitados solo mientras DRAFT/OPEN
  if (!isTournamentRosterOpenSV(_input.tournament.status)) {
    throw new AppError(
      'TORNEO_CERRADO',
      'El torneo no admite nuevos invitados en su estado actual.',
      409,
    );
  }

  //? 2. Los torneos competitivos con costo de inscripción no admiten invitados:
  //?    el gate de Elo y el cierre de resultados de partido no soportan invitados
  //?    en ese escenario (ver hallazgos de verificación de la Fase 5).
  if (_input.tournament.isCompetitive && (_input.tournament.inscriptionPrice ?? 0) > 0) {
    throw new AppError(
      'TORNEO_RESTRINGIDO',
      'Los invitados no pueden inscribirse en torneos competitivos con costo de inscripción.',
      403,
    );
  }

  //? 3. Cupos agotados (REQ-TIL-010)
  if (
    _input.tournament.maxSlots !== null &&
    (await _registrationRepository.countByTournamentIdSV(_input.tournament.id)) >=
      _input.tournament.maxSlots
  ) {
    throw new AppError('CUPOS_AGOTADOS', 'El torneo ya no tiene cupos disponibles.', 409);
  }

  //? 4. Crear la inscripción GUEST en estado PENDING
  return _registrationRepository.createGuestSV({
    tournamentId: _input.tournament.id,
    guestName: _input.guestName,
    guestPhone: _input.guestPhone ?? null,
    guestEmail: _input.guestEmail.toLowerCase(),
    registeredByUserId: _input.registeredByUserId,
    inviteLinkId: _input.inviteLinkId ?? null,
  });
}
