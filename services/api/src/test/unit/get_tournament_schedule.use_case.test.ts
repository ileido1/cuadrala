import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetTournamentScheduleUseCase } from '../../application/use_cases/get_tournament_schedule.use_case.js';

const tournamentRepo = { findByIdSV: vi.fn() };
const scheduleRepo = { findByTournamentIdSV: vi.fn() };
const registrationRepo = { listByTournamentIdSV: vi.fn() };
const courtRepo = { listVenueCourtsSV: vi.fn() };

const useCase = new GetTournamentScheduleUseCase(
  tournamentRepo as never,
  scheduleRepo as never,
  registrationRepo as never,
  courtRepo as never,
);

const SLOT_AT = new Date('2026-10-01T14:00:00.000Z');

const regSV = (id: string, name: string, partner?: string) => ({
  id,
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
});
