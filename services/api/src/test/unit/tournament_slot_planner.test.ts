import { describe, expect, it } from 'vitest';

import { planTournamentMatchSlotsSV } from '../../domain/tournament/tournament_slot_planner.js';

const START = new Date('2026-10-01T14:00:00.000Z');

const plansSV = (pairs: Array<[number, number]>) =>
  pairs.map(([roundNumber, matchNumber]) => ({ roundNumber, matchNumber }));

describe('planTournamentMatchSlotsSV', () => {
  it('should spread the matches of one round across the available courts', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1], [1, 2]]),
      courtIds: ['court-a', 'court-b'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(),
    });

    expect(RESULT.slots).toHaveLength(2);
    //? Los partidos de una misma ronda se juegan a la vez en canchas distintas.
    expect(RESULT.slots[0]?.scheduledAt).toEqual(START);
    expect(RESULT.slots[1]?.scheduledAt).toEqual(START);
    expect(RESULT.slots[0]?.courtId).not.toBe(RESULT.slots[1]?.courtId);
  });

  it('should start a round only after the previous one finished', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1], [2, 1]]),
      courtIds: ['court-a', 'court-b'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(),
    });

    //? Aunque sobre cancha, la ronda 2 no puede empezar antes de que termine la 1:
    //? sus cruces dependen de los resultados de la anterior.
    expect(RESULT.slots[1]?.scheduledAt).toEqual(new Date('2026-10-01T15:00:00.000Z'));
  });

  it('should push the extra matches to the next slot when courts run out', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1], [1, 2], [1, 3]]),
      courtIds: ['court-a', 'court-b'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(),
    });

    expect(RESULT.slots[2]?.scheduledAt).toEqual(new Date('2026-10-01T15:00:00.000Z'));
  });

  //? La sede vende esas mismas canchas: el torneo compite con las reservas
  //? sueltas y no puede pisarlas.
  it('should skip a slot that the venue already has taken', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1]]),
      courtIds: ['court-a', 'court-b'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(['court-a|2026-10-01T14:00:00.000Z']),
    });

    expect(RESULT.slots[0]?.courtId).toBe('court-b');
    expect(RESULT.slots[0]?.scheduledAt).toEqual(START);
  });

  it('should move to a later slot when every court is taken', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1]]),
      courtIds: ['court-a'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(['court-a|2026-10-01T14:00:00.000Z']),
    });

    expect(RESULT.slots[0]?.scheduledAt).toEqual(new Date('2026-10-01T15:00:00.000Z'));
  });

  it('should never put two matches on the same court at the same time', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1], [1, 2], [1, 3], [2, 1], [2, 2]]),
      courtIds: ['court-a', 'court-b'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(),
    });

    const KEYS = RESULT.slots.map((_s) => `${_s.courtId}|${_s.scheduledAt.toISOString()}`);
    expect(new Set(KEYS).size).toBe(KEYS.length);
  });

  //? Sin canchas no se inventa un horario: el cuadro queda sin reservar y el
  //? organizador se entera, en vez de crear partidos que no existen en ningun lado.
  it('should report the matches it could not place when there are no courts', () => {
    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1]]),
      courtIds: [],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: new Set(),
    });

    expect(RESULT.slots).toHaveLength(0);
    expect(RESULT.unplaced).toEqual([{ roundNumber: 1, matchNumber: 1 }]);
  });

  it('should give up instead of searching forever when everything is taken', () => {
    const OCCUPIED = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      OCCUPIED.add(`court-a|${new Date(START.getTime() + i * 3600_000).toISOString()}`);
    }

    const RESULT = planTournamentMatchSlotsSV({
      plans: plansSV([[1, 1]]),
      courtIds: ['court-a'],
      startsAt: START,
      slotMinutes: 60,
      occupiedSlots: OCCUPIED,
      maxSlotsToScan: 24,
    });

    expect(RESULT.slots).toHaveLength(0);
    expect(RESULT.unplaced).toHaveLength(1);
  });
});
