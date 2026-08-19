import { describe, expect, it, vi } from 'vitest';

import { GenerateTournamentScheduleUseCase } from '../../application/use_cases/generate_tournament_schedule.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockFormatPresetRepository = {
  findByIdSV: vi.fn(),
};

const mockTournamentScheduleRepository = {
  createOrValidateIdempotencySV: vi.fn(),
  findByTournamentIdSV: vi.fn(),
};

const mockTournamentRegistrationRepository = {
  listByTournamentIdAndStatusSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new GenerateTournamentScheduleUseCase(
  mockTournamentRepository as never,
  mockFormatPresetRepository as never,
  mockTournamentScheduleRepository as never,
  mockTournamentRegistrationRepository as never,
  mockAssertTournamentOrganizerAccess as never,
);

/** 4 inscripciones AUTHENTICATED + 2 GUEST, todas CONFIRMED. */
const AUTH_REGISTRATIONS = ['reg-auth-1', 'reg-auth-2', 'reg-auth-3', 'reg-auth-4'].map((_id, _i) => ({
  id: _id,
  tournamentId: 'tournament-1',
  userId: `user-${_i}`,
  status: 'CONFIRMED',
  createdAt: new Date(),
}));

const GUEST_REGISTRATIONS = ['reg-guest-1', 'reg-guest-2'].map((_id) => ({
  id: _id,
  tournamentId: 'tournament-1',
  userId: null,
  status: 'CONFIRMED',
  createdAt: new Date(),
}));

describe('GenerateTournamentScheduleUseCase — guest + authenticated tokens', () => {
  it('builds the schedule payload from registrationId tokens (not userId) for a mixed auth+guest roster', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      id: 'tournament-1',
      organizerUserId: 'organizer-1',
      venueId: null,
      formatPresetId: 'preset-1',
      status: 'DRAFT',
    });
    mockFormatPresetRepository.findByIdSV.mockResolvedValue({ id: 'preset-1', code: 'ROUND_ROBIN' });
    mockTournamentRegistrationRepository.listByTournamentIdAndStatusSV.mockResolvedValue([
      ...AUTH_REGISTRATIONS,
      ...GUEST_REGISTRATIONS,
    ]);
    mockTournamentScheduleRepository.createOrValidateIdempotencySV.mockImplementation(async (_args) => ({
      created: true,
      schedule: {
        tournamentId: _args.tournamentId,
        formatCode: _args.formatCode,
        scheduleKey: _args.scheduleKey,
        payload: _args.payload,
      },
    }));

    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalled();
    expect(RESULT.created).toBe(true);

    //? El payload debe referenciar los 6 registrationId (incluyendo los 2 GUEST), nunca userId.
    const PAYLOAD_TOKENS = new Set<string>();
    const PAYLOAD = RESULT.schedule.payload as { rounds: Array<{ matches: Array<{ playerA: string; playerB: string }> }> };
    for (const ROUND of PAYLOAD.rounds) {
      for (const MATCH of ROUND.matches) {
        PAYLOAD_TOKENS.add(MATCH.playerA);
        PAYLOAD_TOKENS.add(MATCH.playerB);
      }
    }

    const EXPECTED_TOKENS = [...AUTH_REGISTRATIONS, ...GUEST_REGISTRATIONS].map((_r) => _r.id);
    for (const TOKEN of EXPECTED_TOKENS) {
      expect(PAYLOAD_TOKENS.has(TOKEN)).toBe(true);
      expect(TOKEN.startsWith('user-')).toBe(false);
    }
    //? Nunca aparece un token `user-*` (userId) en el payload — solo registrationId.
    for (const TOKEN of PAYLOAD_TOKENS) {
      expect(TOKEN.startsWith('user-')).toBe(false);
    }
  });

  it('still generates a valid schedule for an all-authenticated roster (regression: no auth flow breakage)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      id: 'tournament-1',
      organizerUserId: 'organizer-1',
      venueId: null,
      formatPresetId: 'preset-1',
      status: 'DRAFT',
    });
    mockFormatPresetRepository.findByIdSV.mockResolvedValue({ id: 'preset-1', code: 'ROUND_ROBIN' });
    mockTournamentRegistrationRepository.listByTournamentIdAndStatusSV.mockResolvedValue(AUTH_REGISTRATIONS);
    mockTournamentScheduleRepository.createOrValidateIdempotencySV.mockImplementation(async (_args) => ({
      created: true,
      schedule: {
        tournamentId: _args.tournamentId,
        formatCode: _args.formatCode,
        scheduleKey: _args.scheduleKey,
        payload: _args.payload,
      },
    }));

    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(RESULT.created).toBe(true);
    expect(RESULT.schedule.formatCode).toBe('ROUND_ROBIN');
  });
});
