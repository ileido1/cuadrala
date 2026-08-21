import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentMatchMaterializationRepository } from '../../domain/ports/tournament_match_materialization_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';

export class MaterializeTournamentMatchesUseCase {
  constructor(
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
    private readonly _tournamentMatchMaterializationRepository: TournamentMatchMaterializationRepository,
    private readonly _tournamentRegistrationRepository: TournamentRegistrationRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    toStatus: string;
    sportId: string;
    categoryId: string;
    organizerUserId: string;
    startsAt: Date | null;
  }): Promise<{ id: string; name: string; status: string }> {
    //? 1. El calendario debe existir para poder materializar los partidos (spec R3)
    const SCHEDULE = await this._tournamentScheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (SCHEDULE === null) {
      throw new AppError(
        'CALENDARIO_NO_GENERADO',
        'El torneo no tiene un calendario generado; genera el calendario antes de iniciar el torneo.',
        400,
      );
    }

    //? 2. Mapear el payload del calendario a planes de partido (dominio puro); los tokens de
    //? participante son `TournamentRegistration.id` (Slice 1: tournament-guest-registration)
    const RAW_PLANS = buildMaterializedMatchPlansSV({
      formatCode: SCHEDULE.formatCode,
      payload: SCHEDULE.payload,
    });

    //? 3. Resolver cada `participantRef` (registrationId) contra el roster actual del torneo:
    //? AUTHENTICATED → userId set; GUEST → userId null, tournamentRegistrationId set. Un token
    //? que no resuelve contra ninguna inscripción conocida indica un calendario obsoleto
    //? (generado antes del cambio de token userId→registrationId) — el organizador debe
    //? regenerarlo (idempotente, ver Design §Migration / Rollout).
    const REGISTRATIONS = await this._tournamentRegistrationRepository.listByTournamentIdSV(_input.tournamentId);
    const REGISTRATION_BY_ID = new Map(REGISTRATIONS.map((_r) => [_r.id, _r]));

    const PLANS = RAW_PLANS.map((_plan) => ({
      roundNumber: _plan.roundNumber,
      matchNumber: _plan.matchNumber,
      // Sin plan de horario/canchas persistido aún (ver Design §12 open question):
      // se usa el fallback documentado — scheduledAt = Tournament.startsAt, courtId = null.
      scheduledAt: _input.startsAt,
      courtId: null,
      participants: _plan.participants.map((_p) => {
        const REGISTRATION = REGISTRATION_BY_ID.get(_p.participantRef);
        if (REGISTRATION === undefined) {
          throw new AppError(
            'CALENDARIO_OBSOLETO',
            'El calendario está desactualizado; regenera el calendario del torneo.',
            409,
          );
        }
        return {
          userId: REGISTRATION.userId,
          tournamentRegistrationId: REGISTRATION.id,
          teamLabel: _p.teamLabel,
        };
      }),
    }));

    const MATCH_TYPE: 'AMERICANO' | 'REGULAR' = SCHEDULE.formatCode === 'AMERICANO' ? 'AMERICANO' : 'REGULAR';

    //? 3. Transición de estado + materialización en una sola transacción, idempotente por scheduleKey
    const RESULT = await this._tournamentMatchMaterializationRepository.transitionAndMaterializeSV({
      tournamentId: _input.tournamentId,
      toStatus: _input.toStatus,
      scheduleKey: SCHEDULE.scheduleKey,
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      organizerUserId: _input.organizerUserId,
      matchType: MATCH_TYPE,
      matches: PLANS,
    });

    return RESULT.tournament;
  }
}
