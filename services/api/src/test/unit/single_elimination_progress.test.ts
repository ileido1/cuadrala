import { describe, expect, it } from 'vitest';

import { generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import {
  resolveSingleEliminationAdvancementParticipantsSV,
  resolveSingleEliminationProgressSV,
} from '../../domain/single_elimination/single_elimination_progress.js';

describe('resolveSingleEliminationProgressSV', () => {
  //? 4 participantes, sin bye: ronda 1 = 2 semifinales, ronda 2 = final,
  //? ronda 3 = 3er puesto (totalRounds+1).
  it('should feed round r+1 match m from the recorded winners of matches 2m-1 and 2m of round r, and feed the third-place match from the semifinal losers', () => {
    const SCHEDULE = generateSingleEliminationScheduleSV({
      participantRegistrationIds: ['p1', 'p2', 'p3', 'p4'],
      thirdPlaceMatch: true,
    });

    const PROGRESS = resolveSingleEliminationProgressSV({
      schedule: SCHEDULE,
      results: [
        { roundNumber: 1, matchNumber: 1, winnerRef: 'w1', loserRef: 'l1' },
        { roundNumber: 1, matchNumber: 2, winnerRef: 'w2', loserRef: 'l2' },
      ],
    });

    const FINAL = PROGRESS.find((_p) => _p.roundNumber === 2 && _p.matchNumber === 1);
    expect(FINAL).toEqual({ roundNumber: 2, matchNumber: 1, playerARef: 'w1', playerBRef: 'w2' });

    const THIRD_PLACE = PROGRESS.find((_p) => _p.roundNumber === 3 && _p.matchNumber === 1);
    expect(THIRD_PLACE).toEqual({ roundNumber: 3, matchNumber: 1, playerARef: 'l1', playerBRef: 'l2' });
  });

  //? Ronda no jugada: la ref todavía no está resuelta, no se inventa nada.
  it('should leave a match unresolved when its source match has no recorded result yet', () => {
    const SCHEDULE = generateSingleEliminationScheduleSV({
      participantRegistrationIds: ['p1', 'p2', 'p3', 'p4'],
    });

    const PROGRESS = resolveSingleEliminationProgressSV({ schedule: SCHEDULE, results: [] });

    const FINAL = PROGRESS.find((_p) => _p.roundNumber === 2 && _p.matchNumber === 1);
    expect(FINAL).toEqual({ roundNumber: 2, matchNumber: 1, playerARef: null, playerBRef: null });
  });

  //? 3 participantes ⇒ bracketSize=4, 1 bye en la ronda 1. El bye avanza sin
  //? resultado registrado, tomando la ref directo del bracket original.
  it('should auto-advance a first-round bye into the next round without any recorded result', () => {
    const SCHEDULE = generateSingleEliminationScheduleSV({
      participantRegistrationIds: ['p1', 'p2', 'p3'],
    });
    const BYE_MATCH = SCHEDULE.rounds[0]!.matches.find((_m) => _m.bye)!;
    const BYE_REF = BYE_MATCH.playerA ?? BYE_MATCH.playerB;
    const OTHER_MATCH = SCHEDULE.rounds[0]!.matches.find((_m) => !_m.bye)!;

    const PROGRESS = resolveSingleEliminationProgressSV({
      schedule: SCHEDULE,
      //? Sólo se registra resultado del partido jugado; el bye no genera Match.
      results: [{ roundNumber: 1, matchNumber: OTHER_MATCH.matchNumber, winnerRef: 'w-other', loserRef: 'l-other' }],
    });

    const NEXT_ROUND_MATCH_NUMBER = Math.ceil(BYE_MATCH.matchNumber / 2);
    const FED = PROGRESS.find((_p) => _p.roundNumber === 2 && _p.matchNumber === NEXT_ROUND_MATCH_NUMBER);
    expect(FED?.playerARef === BYE_REF || FED?.playerBRef === BYE_REF).toBe(true);
  });

  //? req. 4: winnerRef debe ser opaco. Un identificador de lado de duplas
  //? (comparte dos userIds, nunca uno) se propaga tal cual, sin partirlo ni
  //? asumir que es un único userId.
  it('should propagate a doubles side-opaque winnerRef unchanged into the next round', () => {
    const SCHEDULE = generateSingleEliminationScheduleSV({
      participantRegistrationIds: ['reg-team-1', 'reg-team-2', 'reg-team-3', 'reg-team-4'],
    });

    const DOUBLES_WINNER_REF = 'team:alice-bob';
    const PROGRESS = resolveSingleEliminationProgressSV({
      schedule: SCHEDULE,
      results: [
        { roundNumber: 1, matchNumber: 1, winnerRef: DOUBLES_WINNER_REF, loserRef: 'team:carol-dave' },
        { roundNumber: 1, matchNumber: 2, winnerRef: 'team:erin-frank', loserRef: 'team:grace-heidi' },
      ],
    });

    const FINAL = PROGRESS.find((_p) => _p.roundNumber === 2 && _p.matchNumber === 1);
    expect(FINAL?.playerARef).toBe(DOUBLES_WINNER_REF);
  });
});

describe('resolveSingleEliminationAdvancementParticipantsSV', () => {
  //? Singles: la ref resuelve a un único participante, sin lado (teamLabel null).
  it('should resolve a singles ref to a single participant with no team label', () => {
    const REGISTRATION_BY_ID = new Map([
      ['reg-1', { id: 'reg-1', userId: 'user-1', partnerRegistrationId: null }],
    ]);

    const PARTICIPANTS = resolveSingleEliminationAdvancementParticipantsSV({
      ref: 'reg-1',
      teamLabel: 'A',
      registrationById: REGISTRATION_BY_ID,
    });

    expect(PARTICIPANTS).toEqual([
      { userId: 'user-1', tournamentRegistrationId: 'reg-1', teamLabel: null },
    ]);
  });

  //? Duplas fijas: la ref agrega a la pareja, ambos con el mismo teamLabel —
  //? nunca se avanza a un jugador de la pareja sin el otro.
  it('should resolve a doubles ref to both partners sharing the given team label', () => {
    const REGISTRATION_BY_ID = new Map([
      ['reg-1', { id: 'reg-1', userId: 'user-1', partnerRegistrationId: 'reg-2' }],
      ['reg-2', { id: 'reg-2', userId: 'user-2', partnerRegistrationId: 'reg-1' }],
    ]);

    const PARTICIPANTS = resolveSingleEliminationAdvancementParticipantsSV({
      ref: 'reg-1',
      teamLabel: 'B',
      registrationById: REGISTRATION_BY_ID,
    });

    expect(PARTICIPANTS).toEqual([
      { userId: 'user-1', tournamentRegistrationId: 'reg-1', teamLabel: 'B' },
      { userId: 'user-2', tournamentRegistrationId: 'reg-2', teamLabel: 'B' },
    ]);
  });

  //? Un cuadro desactualizado (ref sin inscripción conocida) no debe materializar
  //? un participante inventado: falla explícito con 409 CALENDARIO_OBSOLETO.
  it('should throw CALENDARIO_OBSOLETO when the ref does not resolve to a known registration', () => {
    expect(() =>
      resolveSingleEliminationAdvancementParticipantsSV({
        ref: 'reg-unknown',
        teamLabel: 'A',
        registrationById: new Map(),
      }),
    ).toThrow('El calendario está desactualizado');
  });

  //? Idem cuando la pareja registrada ya no existe (torneo desactualizado).
  it('should throw CALENDARIO_OBSOLETO when the partner registration is missing', () => {
    const REGISTRATION_BY_ID = new Map([
      ['reg-1', { id: 'reg-1', userId: 'user-1', partnerRegistrationId: 'reg-missing' }],
    ]);

    expect(() =>
      resolveSingleEliminationAdvancementParticipantsSV({
        ref: 'reg-1',
        teamLabel: 'A',
        registrationById: REGISTRATION_BY_ID,
      }),
    ).toThrow('El calendario está desactualizado');
  });
});
