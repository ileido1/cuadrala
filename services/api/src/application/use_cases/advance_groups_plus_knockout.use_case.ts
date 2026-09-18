import { AppError } from '../../domain/errors/app_error.js';
import {
  isGroupsPlusKnockoutResolvedSV,
  resolveGroupsPlusKnockoutTransitionSV,
} from '../../domain/groups_plus_knockout/groups_plus_knockout_transition_resolver.js';
import type { GroupsPlusKnockoutScheduleDTO } from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { TournamentMatchResultRepository } from '../../domain/ports/tournament_match_result_repository.js';
import type { TournamentMatchMaterializationRepository } from '../../domain/ports/tournament_match_materialization_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';

export type GroupsPlusKnockoutAdvanceDTO = {
  advanced: boolean;
  canAdvance: boolean;
  phase: 'GROUPS' | 'KNOCKOUT';
  payload: GroupsPlusKnockoutScheduleDTO;
  createdMatchCount: number;
};

export class AdvanceGroupsPlusKnockoutUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _scheduleRepository: TournamentScheduleRepository,
    private readonly _matchResultRepository: TournamentMatchResultRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _materializationRepository: TournamentMatchMaterializationRepository,
    private readonly _assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<GroupsPlusKnockoutAdvanceDTO> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }
    await this._assertOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    const SCHEDULE = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (SCHEDULE === null) {
      throw new AppError('SCHEDULE_NO_ENCONTRADO', 'El calendario aún no ha sido generado.', 404);
    }
    if (SCHEDULE.formatCode !== 'GROUPS_PLUS_KNOCKOUT') {
      throw new AppError(
        'FORMATO_INVALIDO',
        'La transición de grupos solo aplica a GROUPS_PLUS_KNOCKOUT.',
        409,
      );
    }

    const PAYLOAD = SCHEDULE.payload as GroupsPlusKnockoutScheduleDTO;
    const ALREADY_RESOLVED = isGroupsPlusKnockoutResolvedSV(PAYLOAD);
    if (!ALREADY_RESOLVED) {
      const STATES = await this._matchResultRepository.listTournamentMatchStatesSV({
        tournamentId: _input.tournamentId,
        scheduleKey: SCHEDULE.scheduleKey,
      });
      const RESOLUTION = resolveGroupsPlusKnockoutTransitionSV({
        payload: PAYLOAD,
        matchStates: STATES,
      });
      if (!RESOLUTION.canAdvance) {
        return {
          advanced: false,
          canAdvance: false,
          phase: 'GROUPS',
          payload: PAYLOAD,
          createdMatchCount: 0,
        };
      }

      const UPDATED = await this._scheduleRepository.updatePayloadSV({
        tournamentId: _input.tournamentId,
        payload: RESOLUTION.payload,
      });
      return {
        ...(await this._materializeSemifinalsSV({
          tournament: TOURNAMENT,
          schedule: UPDATED,
          payload: RESOLUTION.payload,
          organizerUserId: _input.actorUserId,
        })),
        advanced: true,
        canAdvance: false,
        phase: 'KNOCKOUT',
        payload: RESOLUTION.payload,
      };
    }

    const MATERIALIZED = await this._materializeSemifinalsSV({
      tournament: TOURNAMENT,
      schedule: SCHEDULE,
      payload: PAYLOAD,
      organizerUserId: _input.actorUserId,
    });
    return {
      ...MATERIALIZED,
      advanced: false,
      canAdvance: false,
      phase: 'KNOCKOUT',
      payload: PAYLOAD,
    };
  }

  private async _materializeSemifinalsSV(_input: {
    tournament: {
      id: string;
      sportId: string;
      categoryId: string;
      organizerUserId: string | null;
    };
    schedule: {
      scheduleKey: string;
      slotPlan: Array<{
        roundNumber: number;
        matchNumber: number;
        courtId: string;
        scheduledAt: Date;
      }> | null;
    };
    payload: GroupsPlusKnockoutScheduleDTO;
    organizerUserId: string;
  }): Promise<{ createdMatchCount: number }> {
    const SEMIFINAL_ROUND = _input.payload.rounds.find(
      (_round) => _round.roundNumber === _input.payload.knockout.semifinalRoundNumber,
    );
    if (SEMIFINAL_ROUND === undefined) {
      throw new AppError('CALENDARIO_INVALIDO', 'El calendario no contiene semifinales.', 409);
    }

    const REGISTRATIONS = await this._registrationRepository.listByTournamentIdSV(_input.tournament.id);
    const REGISTRATION_BY_ID = new Map(REGISTRATIONS.map((_registration) => [_registration.id, _registration]));
    const SLOT_BY_MATCH = new Map(
      (_input.schedule.slotPlan ?? []).map((_slot) => [
        `${_slot.roundNumber}|${_slot.matchNumber}`,
        _slot,
      ]),
    );
    const MATCHES = SEMIFINAL_ROUND.matches.map((_match) => {
      if (_match.playerA === null || _match.playerB === null) {
        throw new AppError('CALENDARIO_INVALIDO', 'Las semifinales no están resueltas.', 409);
      }
      const SLOT = SLOT_BY_MATCH.get(
        `${SEMIFINAL_ROUND.roundNumber}|${_match.matchNumber}`,
      );
      return {
        roundNumber: SEMIFINAL_ROUND.roundNumber,
        matchNumber: _match.matchNumber,
        scheduledAt: SLOT?.scheduledAt ?? null,
        courtId: SLOT?.courtId ?? null,
        participants: [
          ...this._expandRegistrationSV(REGISTRATION_BY_ID, _match.playerA, 'A'),
          ...this._expandRegistrationSV(REGISTRATION_BY_ID, _match.playerB, 'B'),
        ],
      };
    });

    const RESULT = await this._materializationRepository.materializeMissingSV({
      tournamentId: _input.tournament.id,
      scheduleKey: _input.schedule.scheduleKey,
      sportId: _input.tournament.sportId,
      categoryId: _input.tournament.categoryId,
      organizerUserId: _input.tournament.organizerUserId ?? _input.organizerUserId,
      matchType: 'REGULAR',
      matches: MATCHES,
    });
    return { createdMatchCount: RESULT.matchCount };
  }

  private _expandRegistrationSV(
    _byId: Map<string, {
      id: string;
      userId: string | null;
      partnerRegistrationId: string | null;
    }>,
    _registrationId: string,
    _teamLabel: string,
  ): Array<{ userId: string | null; tournamentRegistrationId: string; teamLabel: string }> {
    const REGISTRATION = _byId.get(_registrationId);
    if (REGISTRATION === undefined) {
      throw new AppError('CALENDARIO_OBSOLETO', 'El calendario referencia una inscripción inexistente.', 409);
    }
    const PARTICIPANTS = [
      {
        userId: REGISTRATION.userId,
        tournamentRegistrationId: REGISTRATION.id,
        teamLabel: _teamLabel,
      },
    ];
    if (REGISTRATION.partnerRegistrationId !== null) {
      const PARTNER = _byId.get(REGISTRATION.partnerRegistrationId);
      if (PARTNER === undefined) {
        throw new AppError('CALENDARIO_OBSOLETO', 'El calendario referencia una dupla incompleta.', 409);
      }
      PARTICIPANTS.push({
        userId: PARTNER.userId,
        tournamentRegistrationId: PARTNER.id,
        teamLabel: _teamLabel,
      });
    }
    return PARTICIPANTS;
  }
}
