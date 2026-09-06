import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListMyTournamentMatchesUseCase } from '../../application/use_cases/list_my_tournament_matches.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const scheduleRepo = { findByTournamentIdSV: vi.fn() };
const registrationRepo = { listByTournamentIdSV: vi.fn() };
const responseRepo = { listByMatchSV: vi.fn() };
const courtRepo = { listVenueCourtsSV: vi.fn() };

const useCase = new ListMyTournamentMatchesUseCase(
  tournamentRepo as never,
  scheduleRepo as never,
  registrationRepo as never,
  responseRepo as never,
  courtRepo as never,
);

const SLOT_AT = new Date('2026-10-01T14:00:00.000Z');

const regSV = (id: string, userId: string | null, name: string, partner?: string) => ({
  id,
  userId,
  userName: userId === null ? null : name,
  guestName: userId === null ? name : null,
  partnerRegistrationId: partner ?? null,
});

const BASE = { tournamentId: 't-1', actorUserId: 'user-1' };

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({ id: 't-1', venueId: 'venue-1' });
  scheduleRepo.findByTournamentIdSV.mockResolvedValue({
    formatCode: 'ROUND_ROBIN',
    payload: {
      rounds: [
        { roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-1', playerB: 'reg-3' }] },
      ],
    },
    slotPlan: [
      { roundNumber: 1, matchNumber: 1, courtId: 'court-a', scheduledAt: SLOT_AT },
    ],
  });
  registrationRepo.listByTournamentIdSV.mockResolvedValue([
    regSV('reg-1', 'user-1', 'Ana', 'reg-2'),
    regSV('reg-2', 'user-2', 'Marcos', 'reg-1'),
    regSV('reg-3', 'user-3', 'Lucía', 'reg-4'),
    regSV('reg-4', 'user-4', 'Diego', 'reg-3'),
  ]);
  responseRepo.listByMatchSV.mockResolvedValue([]);
  courtRepo.listVenueCourtsSV.mockResolvedValue([{ id: 'court-a', name: 'Cancha 1' }]);
});

describe('ListMyTournamentMatchesUseCase', () => {
  it('should answer when and where the player plays', async () => {
    const R = await useCase.executeSV(BASE);

    expect(R.items).toHaveLength(1);
    expect(R.items[0]?.scheduledAt).toEqual(SLOT_AT);
    expect(R.items[0]?.courtName).toBe('Cancha 1');
  });

  //? En duplas fijas cada token del cuadro es una pareja: hay que expandirla
  //? para saber con quien y contra quienes juega.
  it('should say who the partner and the opponents are', async () => {
    const R = await useCase.executeSV(BASE);

    expect(R.items[0]?.partners).toEqual(['Marcos']);
    expect(R.items[0]?.opponents).toEqual(['Lucía', 'Diego']);
  });

  it('should not return matches the player is not in', async () => {
    const R = await useCase.executeSV({ ...BASE, actorUserId: 'user-9' });

    expect(R.items).toEqual([]);
  });

  it('should report what the player already answered', async () => {
    responseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'ACCEPTED' },
    ]);

    const R = await useCase.executeSV(BASE);

    expect(R.items[0]?.myResponse).toBe('ACCEPTED');
    expect(R.items[0]?.decision).toBe('PENDING');
  });

  //? Un partido sin turno apartado igual se muestra: el jugador tiene que saber
  //? contra quien juega aunque todavia no haya cancha.
  it('should show a match that has no court yet', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({
      formatCode: 'ROUND_ROBIN',
      payload: {
        rounds: [
          { roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-1', playerB: 'reg-3' }] },
        ],
      },
      slotPlan: null,
    });

    const R = await useCase.executeSV(BASE);

    expect(R.items).toHaveLength(1);
    expect(R.items[0]?.scheduledAt).toBeNull();
    expect(R.items[0]?.courtName).toBeNull();
    expect(R.items[0]?.opponents).toEqual(['Lucía', 'Diego']);
  });

  //? Sin calendario no hay error: es un estado normal del torneo.
  it('should return empty when the schedule was not generated yet', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue(null);

    const R = await useCase.executeSV(BASE);

    expect(R.items).toEqual([]);
  });
});
