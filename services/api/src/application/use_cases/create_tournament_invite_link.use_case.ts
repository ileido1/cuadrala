import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentInviteLinkRepository } from '../../domain/ports/tournament_invite_link_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

const DEFAULT_EXPIRATION_FALLBACK_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_EXPIRATION_OVERRIDE_MS = 60 * 60 * 1000;
const MAX_EXPIRATION_OVERRIDE_MS = 180 * 24 * 60 * 60 * 1000;

export class CreateTournamentInviteLinkUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _inviteLinkRepository: TournamentInviteLinkRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _publicWebUrl: string,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
    expiresAt?: Date;
    maxUses?: number | null;
  }): Promise<{
    id: string;
    token: string;
    url: string;
    deepLink: string;
    expiresAt: Date;
    maxUses: number | null;
    usesCount: 0;
    revokedAt: null;
    createdAt: Date;
  }> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador o staff de su sede puede generar links (REQ-TIL-001)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Rango de negocio de maxUses: null = sin tope, si se define debe ser >= 1 (REQ-TIL-004)
    this._assertMaxUsesInRange(_input.maxUses);

    //? 4. expiresAt: override explícito validado contra la cota dura, o default
    //?    atado al ciclo de vida del torneo (REQ-TIL-003/NFR-TIL-004)
    const EXPIRES_AT =
      _input.expiresAt !== undefined
        ? this._assertExpiresAtOverrideInRange(_input.expiresAt)
        : this._resolveDefaultExpiresAt(TOURNAMENT.registrationClosesAt, TOURNAMENT.startsAt);

    //? 5. Generar token (randomBytes+sha256, en infraestructura) y persistir
    const { link: LINK, token: TOKEN } = await this._inviteLinkRepository.createSV({
      tournamentId: TOURNAMENT.id,
      createdByUserId: _input.actorUserId,
      expiresAt: EXPIRES_AT,
      maxUses: _input.maxUses ?? null,
    });

    //? 6. url y deepLink son la misma URL universal (sin esquema custom)
    const URL = `${this._publicWebUrl}/invite/${TOKEN}`;

    return {
      id: LINK.id,
      token: TOKEN,
      url: URL,
      deepLink: URL,
      expiresAt: LINK.expiresAt,
      maxUses: LINK.maxUses,
      usesCount: 0,
      revokedAt: null,
      createdAt: LINK.createdAt,
    };
  }

  private _assertMaxUsesInRange(_maxUses: number | null | undefined): void {
    if (_maxUses === undefined || _maxUses === null) return;
    if (_maxUses < 1) {
      throw new AppError(
        'MAX_USES_INVALIDO',
        'El límite de usos debe ser nulo (sin tope) o un entero mayor o igual a 1.',
        422,
      );
    }
  }

  private _assertExpiresAtOverrideInRange(_expiresAt: Date): Date {
    const NOW_MS = Date.now();
    const EXPIRES_AT_MS = _expiresAt.getTime();
    if (
      EXPIRES_AT_MS < NOW_MS + MIN_EXPIRATION_OVERRIDE_MS ||
      EXPIRES_AT_MS > NOW_MS + MAX_EXPIRATION_OVERRIDE_MS
    ) {
      throw new AppError(
        'EXPIRACION_INVALIDA',
        'La fecha de expiración debe estar entre 1 hora y 180 días desde ahora.',
        422,
      );
    }
    return _expiresAt;
  }

  /** MIN(registrationClosesAt, startsAt) entre los que sean futuros; si ninguno aplica, +30 días. */
  private _resolveDefaultExpiresAt(
    _registrationClosesAt: Date | null,
    _startsAt: Date | null,
  ): Date {
    const NOW_MS = Date.now();
    const FUTURE_CANDIDATES_MS = [_registrationClosesAt, _startsAt]
      .filter((_date): _date is Date => _date !== null && _date.getTime() > NOW_MS)
      .map((_date) => _date.getTime());

    if (FUTURE_CANDIDATES_MS.length > 0) {
      return new Date(Math.min(...FUTURE_CANDIDATES_MS));
    }
    return new Date(NOW_MS + DEFAULT_EXPIRATION_FALLBACK_MS);
  }
}
