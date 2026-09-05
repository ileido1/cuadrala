import { AppError } from '../../domain/errors/app_error.js';
import {
  resolveSlotDecisionSV,
  type TournamentSlotDecision,
  type TournamentSlotResponseValue,
} from '../../domain/tournament/tournament_slot_decision.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';

export type TournamentSlotResponseRepository = {
  upsertSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    userId: string;
    response: TournamentSlotResponseValue;
  }): Promise<void>;

  listByMatchSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
  }): Promise<Array<{ userId: string; response: TournamentSlotResponseValue }>>;
};

export type TournamentSlotHoldLifecycleRepository = {
  /** Pasa el turno apartado a firme. */
  confirmHoldSV(_input: { courtId: string; scheduledAt: Date }): Promise<boolean>;
  /** Suelta el turno apartado y devuelve la cancha al mercado. */
  releaseHoldSV(_input: { courtId: string; scheduledAt: Date }): Promise<boolean>;
};

/**
 * Un jugador contesta si le sirve el horario que le toco.
 *
 * Cuando aceptan todos, la cancha apartada pasa a firme. Si alguno rechaza, se
 * suelta enseguida: quedarsela sabiendo que ese horario no va le quita a la
 * sede una cancha vendible, y el organizador tiene que reubicar el partido
 * igual.
 */
export class RespondTournamentSlotUseCase {
  constructor(
    private readonly _scheduleRepository: TournamentScheduleRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _responseRepository: TournamentSlotResponseRepository,
    private readonly _holdRepository: TournamentSlotHoldLifecycleRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    actorUserId: string;
    response: TournamentSlotResponseValue;
  }): Promise<{ decision: TournamentSlotDecision }> {
    const SCHEDULE = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (SCHEDULE === null) {
      throw new AppError(
        'CALENDARIO_NO_GENERADO',
        'El torneo todavía no tiene calendario.',
        404,
      );
    }

    const PARTICIPANT_USER_IDS = await this._participantUserIdsSV(SCHEDULE, _input);

    //? Solo contesta quien juega ese partido: aceptar por otro decidiria sobre
    //? su tiempo.
    if (!PARTICIPANT_USER_IDS.includes(_input.actorUserId)) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No juegas ese partido, así que no podés responder por su horario.',
        403,
      );
    }

    await this._responseRepository.upsertSV({
      tournamentId: _input.tournamentId,
      roundNumber: _input.roundNumber,
      matchNumber: _input.matchNumber,
      userId: _input.actorUserId,
      response: _input.response,
    });

    const RESPONSES = await this._responseRepository.listByMatchSV({
      tournamentId: _input.tournamentId,
      roundNumber: _input.roundNumber,
      matchNumber: _input.matchNumber,
    });

    const DECISION = resolveSlotDecisionSV({
      participantUserIds: PARTICIPANT_USER_IDS,
      responses: RESPONSES,
    });

    const SLOT = (SCHEDULE.slotPlan ?? []).find(
      (_s) =>
        _s.roundNumber === _input.roundNumber && _s.matchNumber === _input.matchNumber,
    );

    //? Un partido sin turno apartado (la sede no daba, o se perdio la carrera)
    //? igual registra la respuesta: le sirve al organizador cuando lo reubique.
    if (SLOT !== undefined) {
      const HOLD = { courtId: SLOT.courtId, scheduledAt: SLOT.scheduledAt };
      if (DECISION === 'ACCEPTED') {
        await this._holdRepository.confirmHoldSV(HOLD);
      } else if (DECISION === 'REJECTED') {
        await this._holdRepository.releaseHoldSV(HOLD);
      }
    }

    return { decision: DECISION };
  }

  /** Los jugadores con cuenta de ese partido; los invitados no pueden responder. */
  private async _participantUserIdsSV(
    _schedule: { formatCode: string; payload: unknown },
    _match: { tournamentId: string; roundNumber: number; matchNumber: number },
  ): Promise<string[]> {
    const PLAN = buildMaterializedMatchPlansSV({
      formatCode: _schedule.formatCode,
      payload: _schedule.payload,
    }).find(
      (_p) =>
        _p.roundNumber === _match.roundNumber && _p.matchNumber === _match.matchNumber,
    );

    if (PLAN === undefined) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'Ese partido no existe en el cuadro.', 404);
    }

    const REGISTRATIONS = await this._registrationRepository.listByTournamentIdSV(
      _match.tournamentId,
    );
    const BY_ID = new Map(REGISTRATIONS.map((_r) => [_r.id, _r]));

    return PLAN.participants
      .map((_p) => BY_ID.get(_p.participantRef)?.userId ?? null)
      .filter((_id): _id is string => _id !== null);
  }
}
