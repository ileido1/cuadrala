import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export type TournamentViewVisibility = 'PUBLIC' | 'PRIVATE' | null;

export type AssertTournamentViewAccessInput = {
  readonly tournamentId: string;
  /** `undefined` cuando la request no trae sesión (endpoints con `optionalAuth`). */
  readonly actorUserId: string | undefined;
  /** `null` se trata igual que `PUBLIC`: ningún torneo existente hoy deja este campo sin declarar. */
  readonly visibility: TournamentViewVisibility;
  readonly organizerUserId: string | null;
  readonly venueId: string | null;
};

/**
 * Verifica que el actor pueda ver un torneo PRIVATE: organizador, staff de la
 * sede, o participante con inscripción activa (PENDING/CONFIRMED, no
 * WITHDRAWN). Un torneo PUBLIC (o sin visibilidad declarada) es visible para
 * cualquiera, con o sin sesión — mismo comportamiento que ya tenían el
 * detalle, el scoreboard y el bracket. Comparten esta regla
 * `GetTournamentUseCase`, `GetTournamentScoreboardUseCase` y
 * `GetTournamentBracketUseCase`, para no triplicar el chequeo.
 */
export class AssertTournamentViewAccessUseCase {
  constructor(
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _tournamentRegistrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: AssertTournamentViewAccessInput): Promise<void> {
    //? 1. Torneo PUBLIC (o sin visibilidad declarada): acceso libre, sin sesión.
    if (_input.visibility !== 'PRIVATE') {
      return;
    }

    //? 2. Torneo PRIVATE: sin sesión no hay rol posible que evaluar.
    if (_input.actorUserId === undefined) {
      throw new AppError('NO_AUTORIZADO', 'Se requiere sesion para ver este torneo.', 401);
    }

    //? 3. Organizador o staff de la sede del torneo: acceso directo.
    const HAS_ORGANIZER_ACCESS = await this._assertTournamentOrganizerAccess.hasAccessSV({
      actorUserId: _input.actorUserId,
      organizerUserId: _input.organizerUserId,
      venueId: _input.venueId,
    });
    if (HAS_ORGANIZER_ACCESS) {
      return;
    }

    //? 4. Participante con inscripción activa (no retirada): acceso directo.
    const REGISTRATION = await this._tournamentRegistrationRepository.findByTournamentAndUserSV(
      _input.tournamentId,
      _input.actorUserId,
    );
    if (REGISTRATION !== null && REGISTRATION.status !== 'WITHDRAWN') {
      return;
    }

    //? Ningún rol de acceso válido: rechazar con 403.
    throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver este torneo.', 403);
  }
}
