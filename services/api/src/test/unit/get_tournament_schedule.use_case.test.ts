import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetTournamentScheduleUseCase } from '../../application/use_cases/get_tournament_schedule.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const scheduleRepo = { findByTournamentIdSV: vi.fn() };
const registrationRepo = { listByTournamentIdSV: vi.fn() };
const courtRepo = { listVenueCourtsSV: vi.fn() };
const matchResultRepo = { listTournamentMatchStatesSV: vi.fn() };
const slotResponseRepo = { listByMatchSV: vi.fn() };

const useCase = new GetTournamentScheduleUseCase(
  tournamentRepo as never,
  scheduleRepo as never,
  registrationRepo as never,
  courtRepo as never,
  matchResultRepo as never,
  slotResponseRepo as never,
);

const SLOT_AT = new Date('2026-10-01T14:00:00.000Z');

const regSV = (id: string, name: string, partner?: string, userId?: string) => ({
  id,
  userId: userId ?? id.replace('reg-', 'user-'),
  userName: name,
  guestName: null,
  partnerRegistrationId: partner ?? null,
});

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepo.findByIdSV.mockResolvedValue({ id: 't-1', venueId: 'venue-1' });
  scheduleRepo.findByTournamentIdSV.mockResolvedValue({
    tournamentId: 't-1',
    formatCode: 'ROUND_ROBIN',
    scheduleKey: 'key-1',
    payload: {
      rounds: [
        { roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-1', playerB: 'reg-3' }] },
      ],
    },
    slotPlan: [{ roundNumber: 1, matchNumber: 1, courtId: 'court-a', scheduledAt: SLOT_AT }],
  });
  registrationRepo.listByTournamentIdSV.mockResolvedValue([
    regSV('reg-1', 'Ana'),
    regSV('reg-3', 'Lucía'),
  ]);
  courtRepo.listVenueCourtsSV.mockResolvedValue([{ id: 'court-a', name: 'Cancha 1' }]);
  matchResultRepo.listTournamentMatchStatesSV.mockResolvedValue([]);
  slotResponseRepo.listByMatchSV.mockResolvedValue([]);
});

describe('GetTournamentScheduleUseCase', () => {
  //? El endpoint devolvia solo `payload` —tokens de inscripcion, sin nombres ni
  //? horarios— mientras el cliente esperaba `rounds`: la pestana de calendario
  //? mostraba vacio en silencio.
  it('should return the bracket ready to display', async () => {
    const R = await useCase.executeSV('t-1');

    expect(R.rounds).toHaveLength(1);
    expect(R.rounds[0]?.name).toBe('Ronda 1');
    expect(R.rounds[0]?.matches[0]?.label).toBe('Ana vs Lucía');
    expect(R.rounds[0]?.matches[0]?.scheduledAt).toEqual(SLOT_AT);
    expect(R.rounds[0]?.matches[0]?.courtName).toBe('Cancha 1');
  });

  //? `payload` sigue estando: es el cuadro crudo del formato y puede haber algo
  //? que lo consuma.
  it('should keep returning the raw payload', async () => {
    const R = await useCase.executeSV('t-1');

    expect(R.payload).toBeDefined();
    expect(R.scheduleKey).toBe('key-1');
  });

  it('should name both members of a pair in the label', async () => {
    registrationRepo.listByTournamentIdSV.mockResolvedValue([
      regSV('reg-1', 'Ana', 'reg-2'),
      regSV('reg-2', 'Marcos', 'reg-1'),
      regSV('reg-3', 'Lucía', 'reg-4'),
      regSV('reg-4', 'Diego', 'reg-3'),
    ]);

    const R = await useCase.executeSV('t-1');

    expect(R.rounds[0]?.matches[0]?.label).toBe('Ana · Marcos vs Lucía · Diego');
  });

  it('should return a match with no slot as pending', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({
      tournamentId: 't-1',
      formatCode: 'ROUND_ROBIN',
      scheduleKey: 'key-1',
      payload: {
        rounds: [
          { roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-1', playerB: 'reg-3' }] },
        ],
      },
      slotPlan: null,
    });

    const R = await useCase.executeSV('t-1');

    expect(R.rounds[0]?.matches[0]?.scheduledAt).toBeNull();
    expect(R.rounds[0]?.matches[0]?.courtName).toBeNull();
  });

  //? Un formato que el dominio no sabe leer no puede tirar abajo la lectura
  //? entera del calendario.
  it('should degrade to an empty view for an unknown format', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue({
      tournamentId: 't-1',
      formatCode: 'LO_QUE_SEA',
      scheduleKey: 'key-1',
      payload: {},
      slotPlan: null,
    });

    const R = await useCase.executeSV('t-1');

    expect(R.rounds).toEqual([]);
    expect(R.formatCode).toBe('LO_QUE_SEA');
  });

  it('should fail when the schedule was not generated', async () => {
    scheduleRepo.findByTournamentIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV('t-1')).rejects.toThrow(
      'El calendario aún no ha sido generado.',
    );
  });

  //? D2: `TournamentScheduleMatchViewDTO` gana `matchId`/`matchStatus`/`scores`
  //? resueltos via `formatParameters.{scheduleKey,roundNumber,matchNumber}`.
  it('should show matchId, FINISHED status and scores for a slot with a recorded result', async () => {
    matchResultRepo.listTournamentMatchStatesSV.mockResolvedValue([
      {
        roundNumber: 1,
        matchNumber: 1,
        matchId: 'match-1',
        matchStatus: 'FINISHED',
        sides: [
          { sideKey: 'user-1', userIds: ['user-1'] },
          { sideKey: 'user-3', userIds: ['user-3'] },
        ],
        scores: [
          { userId: 'user-1', points: 6 },
          { userId: 'user-3', points: 2 },
        ],
      },
    ]);

    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(matchResultRepo.listTournamentMatchStatesSV).toHaveBeenCalledWith({
      tournamentId: 't-1',
      scheduleKey: 'key-1',
    });
    expect(MATCH?.matchId).toBe('match-1');
    expect(MATCH?.matchStatus).toBe('FINISHED');
    expect(MATCH?.scores).toEqual([
      { userId: 'user-1', points: 6 },
      { userId: 'user-3', points: 2 },
    ]);
  });

  //? Task S6b: "A slot with no materialized Match yet gets nulls/empties. It
  //? must not throw."
  it('should return nulls and empty arrays for a slot with no materialized Match', async () => {
    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(MATCH?.matchId).toBeNull();
    expect(MATCH?.matchStatus).toBeNull();
    expect(MATCH?.sides).toEqual([]);
    expect(MATCH?.scores).toEqual([]);
  });

  //? `sides` refleja tal cual lo que agrupó el puerto (teamLabel ?? userId),
  //? dos jugadores por lado en una dupla.
  it('should group two players per side for a doubles match', async () => {
    matchResultRepo.listTournamentMatchStatesSV.mockResolvedValue([
      {
        roundNumber: 1,
        matchNumber: 1,
        matchId: 'match-1',
        matchStatus: 'SCHEDULED',
        sides: [
          { sideKey: 'A', userIds: ['a1', 'a2'] },
          { sideKey: 'B', userIds: ['b1', 'b2'] },
        ],
        scores: [],
      },
    ]);

    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(MATCH?.sides).toEqual([
      { sideKey: 'A', userIds: ['a1', 'a2'] },
      { sideKey: 'B', userIds: ['b1', 'b2'] },
    ]);
  });

  it('should default decision to PENDING when nobody responded yet', async () => {
    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(MATCH?.decision).toBe('PENDING');
    expect(MATCH?.rejectedByName).toBeNull();
  });

  it('should resolve decision as ACCEPTED when every participant with an account accepted', async () => {
    slotResponseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-1', response: 'ACCEPTED' },
      { userId: 'user-3', response: 'ACCEPTED' },
    ]);

    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(MATCH?.decision).toBe('ACCEPTED');
    expect(MATCH?.rejectedByName).toBeNull();
  });

  it('should resolve decision as REJECTED and name who rejected', async () => {
    slotResponseRepo.listByMatchSV.mockResolvedValue([
      { userId: 'user-3', response: 'REJECTED' },
    ]);

    const R = await useCase.executeSV('t-1');
    const MATCH = R.rounds[0]?.matches[0];

    expect(slotResponseRepo.listByMatchSV).toHaveBeenCalledWith({
      tournamentId: 't-1',
      roundNumber: 1,
      matchNumber: 1,
    });
    expect(MATCH?.decision).toBe('REJECTED');
    expect(MATCH?.rejectedByName).toBe('Lucía');
  });
});
