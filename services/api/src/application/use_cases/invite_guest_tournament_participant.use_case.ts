import { AppError } from '../../domain/errors/app_error.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type {
  TournamentRegistrationDTO,
  TournamentRegistrationRepository,
} from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { EmailSender } from '../../domain/ports/email_sender.js';

export class InviteGuestTournamentParticipantUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _emailSender: EmailSender | null = null,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    guestName: string;
    guestPhone?: string | null;
    guestEmail: string;
    actorUserId: string;
  }): Promise<TournamentRegistrationDTO> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador puede invitar invitados (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. El roster se bloquea desde IN_PROGRESS; invitar invitados solo mientras DRAFT/OPEN
    if (!isTournamentRosterOpenSV(TOURNAMENT.status)) {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite nuevos invitados en su estado actual.',
        409,
      );
    }

    //? 4. Los torneos competitivos con costo de inscripción no admiten invitados:
    //?    el gate de Elo y el cierre de resultados de partido no soportan invitados
    //?    en ese escenario (ver hallazgos de verificación de la Fase 5).
    if (TOURNAMENT.isCompetitive && (TOURNAMENT.inscriptionPrice ?? 0) > 0) {
      throw new AppError(
        'TORNEO_RESTRINGIDO',
        'Los invitados no pueden inscribirse en torneos competitivos con costo de inscripción.',
        403,
      );
    }

    if (
      TOURNAMENT.maxSlots !== null &&
      (await this._registrationRepository.countByTournamentIdSV(_input.tournamentId)) >=
        TOURNAMENT.maxSlots
    ) {
      throw new AppError('CUPOS_AGOTADOS', 'El torneo ya no tiene cupos disponibles.', 409);
    }

    //? 5. Crear la inscripción GUEST en estado PENDING
    const REGISTRATION = await this._registrationRepository.createGuestSV({
      tournamentId: _input.tournamentId,
      guestName: _input.guestName,
      guestPhone: _input.guestPhone ?? null,
      guestEmail: _input.guestEmail.toLowerCase(),
      registeredByUserId: _input.actorUserId,
    });
    await this._notifyGuestSV(_input.guestEmail, TOURNAMENT.name);
    return REGISTRATION;
  }

  private async _notifyGuestSV(_email: string, _tournamentName: string): Promise<void> {
    if (this._emailSender === null) return;
    try {
      await this._emailSender.sendSV({
        to: _email,
        subject: `Invitación al torneo ${_tournamentName}`,
        text: `Te agregaron como invitado al torneo ${_tournamentName}. Contactá al organizador para confirmar tu participación.`,
      });
    } catch (_error) {
      console.error('[tournament-invite-email] No se pudo enviar el correo al invitado.', {
        email: _email,
        tournamentName: _tournamentName,
        error: _error,
      });
    }
  }
}
