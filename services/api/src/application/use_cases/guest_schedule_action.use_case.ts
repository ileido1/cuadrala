import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentGuestScheduleTokenRepository } from '../../domain/ports/tournament_guest_schedule_token_repository.js';
import type {
  TournamentSlotResponseRepository,
  TournamentSlotHoldLifecycleRepository,
} from './respond_tournament_slot.use_case.js';

export class GuestScheduleActionUseCase {
  constructor(
    private readonly _tokens: TournamentGuestScheduleTokenRepository,
    private readonly _schedules: TournamentScheduleRepository,
    private readonly _responses: TournamentSlotResponseRepository,
    private readonly _holds: TournamentSlotHoldLifecycleRepository,
  ) {}

  async getSV(_token: string): Promise<{
    guestName: string | null;
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    scheduledAt: Date | null;
    courtId: string | null;
    response: 'ACCEPTED' | 'REJECTED' | null;
  }> {
    const TOKEN = await this._validTokenSV(_token);
    const SLOT = await this._slotForRegistrationSV(TOKEN.tournamentId, TOKEN.registrationId);
    const RESPONSES = await this._responses.listByMatchSV(SLOT);
    return {
      guestName: TOKEN.guestName,
      tournamentId: TOKEN.tournamentId,
      roundNumber: SLOT.roundNumber,
      matchNumber: SLOT.matchNumber,
      scheduledAt: SLOT.scheduledAt,
      courtId: SLOT.courtId,
      response:
        RESPONSES.find((_response) => _response.tournamentRegistrationId === TOKEN.registrationId)
          ?.response ?? null,
    };
  }

  async respondSV(
    _token: string,
    _response: 'ACCEPTED' | 'REJECTED',
  ): Promise<{ response: string }> {
    const TOKEN = await this._validTokenSV(_token);
    const SLOT = await this._slotForRegistrationSV(TOKEN.tournamentId, TOKEN.registrationId);
    await this._responses.upsertSV({
      tournamentId: TOKEN.tournamentId,
      roundNumber: SLOT.roundNumber,
      matchNumber: SLOT.matchNumber,
      tournamentRegistrationId: TOKEN.registrationId,
      response: _response,
    });
    if (SLOT.scheduledAt !== null && SLOT.courtId !== null) {
      if (_response === 'ACCEPTED')
        await this._holds.confirmHoldSV({ courtId: SLOT.courtId, scheduledAt: SLOT.scheduledAt });
      else
        await this._holds.releaseHoldSV({ courtId: SLOT.courtId, scheduledAt: SLOT.scheduledAt });
    }
    await this._tokens.markUsedSV(TOKEN.id);
    return { response: _response };
  }

  private async _validTokenSV(_rawToken: string) {
    const TOKEN = await this._tokens.findByHashSV(_rawToken);
    if (TOKEN === null || TOKEN.expiresAt.getTime() <= Date.now()) {
      throw new AppError('TOKEN_INVALIDO', 'El enlace ya no es válido.', 410);
    }
    if (TOKEN.usedAt !== null) {
      throw new AppError('TOKEN_YA_USADO', 'Este enlace ya fue utilizado.', 409);
    }
    return TOKEN;
  }

  private async _slotForRegistrationSV(_tournamentId: string, _registrationId: string) {
    const SCHEDULE = await this._schedules.findByTournamentIdSV(_tournamentId);
    if (SCHEDULE === null)
      throw new AppError(
        'CALENDARIO_NO_GENERADO',
        'El calendario todavía no está disponible.',
        404,
      );
    const PLAN = buildMaterializedMatchPlansSV({
      formatCode: SCHEDULE.formatCode,
      payload: SCHEDULE.payload,
    }).find((_plan) =>
      _plan.participants.some((_participant) => _participant.participantRef === _registrationId),
    );
    if (PLAN === undefined)
      throw new AppError(
        'PARTIDO_NO_ENCONTRADO',
        'No encontramos un partido asignado para esta inscripción.',
        404,
      );
    const SLOT = (SCHEDULE.slotPlan ?? []).find(
      (_slot) => _slot.roundNumber === PLAN.roundNumber && _slot.matchNumber === PLAN.matchNumber,
    );
    return {
      tournamentId: _tournamentId,
      roundNumber: PLAN.roundNumber,
      matchNumber: PLAN.matchNumber,
      courtId: SLOT?.courtId ?? null,
      scheduledAt:
        SLOT?.scheduledAt instanceof Date
          ? SLOT.scheduledAt
          : SLOT?.scheduledAt
            ? new Date(SLOT.scheduledAt)
            : null,
    };
  }
}
