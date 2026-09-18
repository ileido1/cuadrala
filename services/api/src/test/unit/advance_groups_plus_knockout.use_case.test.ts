import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdvanceGroupsPlusKnockoutUseCase } from '../../application/use_cases/advance_groups_plus_knockout.use_case.js';
import { generateGroupsPlusKnockoutScheduleSV } from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';
import type { TournamentMatchStateSV } from '../../domain/ports/tournament_match_result_repository.js';

const tournamentRepository = { findByIdSV: vi.fn() };
const scheduleRepository = {
  findByTournamentIdSV: vi.fn(),
  updatePayloadSV: vi.fn(),
};
const matchResultRepository = { listTournamentMatchStatesSV: vi.fn() };
const registrationRepository = { listByTournamentIdSV: vi.fn() };
const materializationRepository = { materializeMissingSV: vi.fn() };
const accessUseCase = { executeSV: vi.fn() };

const useCase = new AdvanceGroupsPlusKnockoutUseCase(
  tournamentRepository as never,
  scheduleRepository as never,
  matchResultRepository as never,
  registrationRepository as never,
  materializationRepository as never,
  accessUseCase as never,
);

const TOURNAMENT = {
  id: 'tournament-1',
  name: 'Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  organizerUserId: 'organizer-1',
  venueId: null,
};

function completeStatesSV(_payload: ReturnType<typeof generateGroupsPlusKnockoutScheduleSV>): TournamentMatchStateSV[] {
  return _payload.rounds
    .filter((_round) => _round.stage === 'GROUP')
    .map((_round) => {
      const MATCH = _round.matches[0]!;
      return {
        roundNumber: _round.roundNumber,
        matchNumber: MATCH.matchNumber,
        matchId: `match-${_round.roundNumber}`,
        matchStatus: 'FINISHED',
        sides: [
          { sideKey: MATCH.playerA!, userIds: [null], registrationIds: [MATCH.playerA!] },
          { sideKey: MATCH.playerB!, userIds: [null], registrationIds: [MATCH.playerB!] },
        ],
        scores: [
          { userId: null, tournamentRegistrationId: MATCH.playerA, points: 10 },
          { userId: null, tournamentRegistrationId: MATCH.playerB, points: 5 },
        ],
      };
    });
}

describe('AdvanceGroupsPlusKnockoutUseCase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the payload and materializes only semifinals, then is idempotent', async () => {
    const INITIAL_PAYLOAD = generateGroupsPlusKnockoutScheduleSV({
      participantRegistrationIds: ['reg-a', 'reg-b', 'reg-c', 'reg-d'],
    });
    let CURRENT_PAYLOAD = INITIAL_PAYLOAD;
    const INITIAL_SCHEDULE = {
      tournamentId: 'tournament-1',
      formatCode: 'GROUPS_PLUS_KNOCKOUT',
      scheduleKey: 'groups_plus_knockout:v1:test',
      payload: INITIAL_PAYLOAD,
      slotPlan: null,
    };
    scheduleRepository.findByTournamentIdSV.mockImplementation(async () => ({
      ...INITIAL_SCHEDULE,
      payload: CURRENT_PAYLOAD,
    }));
    scheduleRepository.updatePayloadSV.mockImplementation(async ({ payload }) => {
      CURRENT_PAYLOAD = payload;
      return { ...INITIAL_SCHEDULE, payload };
    });
    tournamentRepository.findByIdSV.mockResolvedValue(TOURNAMENT);
    matchResultRepository.listTournamentMatchStatesSV.mockResolvedValue(completeStatesSV(INITIAL_PAYLOAD));
    registrationRepository.listByTournamentIdSV.mockResolvedValue(
      ['reg-a', 'reg-b', 'reg-c', 'reg-d'].map((_id) => ({
        id: _id,
        userId: `user-${_id}`,
        partnerRegistrationId: null,
      })),
    );
    materializationRepository.materializeMissingSV.mockResolvedValue({
      created: true,
      matchCount: 2,
      tournament: { id: 'tournament-1', name: 'Demo', status: 'IN_PROGRESS' },
    });

    const FIRST = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });
    const SECOND = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(FIRST).toMatchObject({ advanced: true, phase: 'KNOCKOUT', createdMatchCount: 2 });
    expect(SECOND).toMatchObject({ advanced: false, phase: 'KNOCKOUT', createdMatchCount: 2 });
    expect(scheduleRepository.updatePayloadSV).toHaveBeenCalledTimes(1);
    expect(materializationRepository.materializeMissingSV).toHaveBeenCalledTimes(2);
  });
});
