import { AppError } from '../../domain/errors/app_error.js';
import { registerGuestForTournamentCoreSV } from '../helpers/register_guest_for_tournament_core.js';
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

    //? 3. Roster-open + restricción competitivo/pago + cupos + alta GUEST:
    //?    cuerpo de negocio compartido con el registro vía invite link
    //?    (ver design.md, decisión #1 — este caso de uso NO delega la
    //?    autorización al helper, solo el cuerpo de negocio posterior a ella).
    const REGISTRATION = await registerGuestForTournamentCoreSV(
      {
        tournament: {
          id: TOURNAMENT.id,
          status: TOURNAMENT.status,
          isCompetitive: TOURNAMENT.isCompetitive,
          inscriptionPrice: TOURNAMENT.inscriptionPrice,
          maxSlots: TOURNAMENT.maxSlots,
        },
        guestName: _input.guestName,
        guestPhone: _input.guestPhone ?? null,
        guestEmail: _input.guestEmail,
        registeredByUserId: _input.actorUserId,
      },
      this._registrationRepository,
    );
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
