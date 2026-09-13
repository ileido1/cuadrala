import type {
  MatchParticipantSideLookupSV,
  TournamentMatchResultRepository,
  TournamentMatchStateSV,
} from '../../domain/ports/tournament_match_result_repository.js';
import { AppError } from '../../domain/errors/app_error.js';
import { groupMatchParticipantsBySideSV } from '../../domain/tournament/match_side_aggregation.js';
import {
  resolveSingleEliminationAdvancementParticipantsSV,
  resolveSingleEliminationProgressSV,
  type SingleEliminationAdvancementRegistrationSV,
  type SingleEliminationRecordedResultSV,
} from '../../domain/single_elimination/single_elimination_progress.js';
import type { SingleEliminationScheduleDTO } from '../../domain/single_elimination/bracket_generator.js';
import { PRISMA } from '../prisma_client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const SINGLE_ELIMINATION_FORMAT_CODE = 'SINGLE_ELIMINATION';

/** Cliente Prisma dentro de una transacción interactiva (`$transaction(async (_tx) => ...)`). */
type PrismaTransactionClientSV = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export class PrismaTournamentMatchResultRepository implements TournamentMatchResultRepository {
  async getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null> {
    const MATCH = await PRISMA.match.findFirst({
      where: { tournamentId: _tournamentId },
      select: { court: { select: { venueId: true } } },
    });
    return MATCH?.court?.venueId ?? null;
  }

  async matchBelongsToTournamentSV(
    _matchId: string,
    _tournamentId: string,
  ): Promise<boolean> {
    const MATCH = await PRISMA.match.findFirst({
      where: { id: _matchId, tournamentId: _tournamentId },
      select: { id: true },
    });
    return MATCH !== null;
  }

  async matchHasResultSV(_matchId: string): Promise<boolean> {
    const EXISTING = await PRISMA.matchResult.findFirst({
      where: { matchId: _matchId },
      select: { id: true },
    });
    return EXISTING !== null;
  }

  async registerResultAndAdvanceSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date; createdMatchIds: string[] }> {
    return PRISMA.$transaction(async (_tx) => {
      const MATCH = await _tx.match.findUnique({
        where: { id: _input.matchId },
        select: {
          tournamentId: true,
          sportId: true,
          categoryId: true,
          organizerUserId: true,
          type: true,
          formatParameters: true,
        },
      });
      if (MATCH === null || MATCH.tournamentId === null) {
        throw new AppError('VALIDACION_FALLIDA', 'El partido no pertenece a este torneo.', 400);
      }
      const TOURNAMENT_ID = MATCH.tournamentId;

      //? Lock de torneo (D13): serializa avances concurrentes del mismo cuadro.
      //? Dos semifinales resueltas a la vez nunca corren esto en paralelo — la
      //? segunda espera a que la primera confirme, así que su lectura de
      //? "partidos ya jugados" (más abajo) siempre ve el resultado de la primera.
      await _tx.$executeRaw`SELECT id FROM "Tournament" WHERE id = ${TOURNAMENT_ID} FOR UPDATE`;

      //? Lock + recheck del partido (mismo patrón que el guard no atómico de la
      //? capa de aplicación): evita duplicar el resultado bajo concurrencia real.
      await _tx.$executeRaw`SELECT id FROM "Match" WHERE id = ${_input.matchId} FOR UPDATE`;
      const EXISTING = await _tx.matchResult.findFirst({
        where: { matchId: _input.matchId },
        select: { id: true },
      });
      if (EXISTING !== null) {
        throw new AppError('RESULTADO_YA_CARGADO', 'Este partido ya tiene un resultado cargado.', 409);
      }

      const CREATED_RESULT = await _tx.matchResult.create({
        data: { matchId: _input.matchId },
      });

      await _tx.matchResultScore.createMany({
        data: _input.scores.map((_s) => ({
          resultId: CREATED_RESULT.id,
          userId: _s.userId,
          points: _s.points,
        })),
      });

      await _tx.match.update({
        where: { id: _input.matchId },
        data: { status: 'FINISHED' },
      });

      const CREATED_MATCH_IDS = await this._advanceSingleEliminationIfApplicableSV(_tx, {
        tournamentId: TOURNAMENT_ID,
        currentMatch: MATCH,
      });

      return {
        resultId: CREATED_RESULT.id,
        recordedAt: CREATED_RESULT.recordedAt,
        createdMatchIds: CREATED_MATCH_IDS,
      };
    });
  }

  /**
   * Avance de eliminación simple (D13/S7c-1), dentro de la misma transacción
   * y lock que el resultado recién escrito arriba. Si el torneo no es SE,
   * no hace nada (`[]`). Idempotente: un partido de ronda siguiente ya
   * materializado (reintento, o resuelto por el otro lado de la misma
   * transacción bloqueada) nunca se duplica.
   */
  private async _advanceSingleEliminationIfApplicableSV(
    _tx: PrismaTransactionClientSV,
    _input: {
      tournamentId: string;
      currentMatch: {
        sportId: string;
        categoryId: string;
        organizerUserId: string;
        type: string;
        formatParameters: unknown;
      };
    },
  ): Promise<string[]> {
    const SCHEDULE = await _tx.tournamentSchedule.findUnique({
      where: { tournamentId: _input.tournamentId },
      select: { formatCode: true, scheduleKey: true, payload: true },
    });
    if (SCHEDULE === null || SCHEDULE.formatCode !== SINGLE_ELIMINATION_FORMAT_CODE) {
      return [];
    }

    const RESULTS = await this._listPlayedSingleEliminationResultsSV(_tx, {
      tournamentId: _input.tournamentId,
      scheduleKey: SCHEDULE.scheduleKey,
    });

    const PROGRESS = resolveSingleEliminationProgressSV({
      schedule: SCHEDULE.payload as SingleEliminationScheduleDTO,
      results: RESULTS,
    });

    const RESOLVED_SLOTS = PROGRESS.filter(
      (_slot) => _slot.playerARef !== null && _slot.playerBRef !== null,
    );
    if (RESOLVED_SLOTS.length === 0) return [];

    const REGISTRATIONS = await _tx.tournamentRegistration.findMany({
      where: { tournamentId: _input.tournamentId },
      select: { id: true, userId: true, partnerRegistrationId: true },
    });
    const REGISTRATION_BY_ID = new Map<string, SingleEliminationAdvancementRegistrationSV>(
      REGISTRATIONS.map((_r) => [_r.id, _r]),
    );

    const CREATED_MATCH_IDS: string[] = [];
    for (const SLOT of RESOLVED_SLOTS) {
      const ALREADY_MATERIALIZED = await _tx.match.findFirst({
        where: {
          tournamentId: _input.tournamentId,
          AND: [
            { formatParameters: { path: ['scheduleKey'], equals: SCHEDULE.scheduleKey } },
            { formatParameters: { path: ['roundNumber'], equals: SLOT.roundNumber } },
            { formatParameters: { path: ['matchNumber'], equals: SLOT.matchNumber } },
          ],
        },
        select: { id: true },
      });
      if (ALREADY_MATERIALIZED !== null) continue;

      const PARTICIPANTS = [
        ...resolveSingleEliminationAdvancementParticipantsSV({
          ref: SLOT.playerARef!,
          teamLabel: 'A',
          registrationById: REGISTRATION_BY_ID,
        }),
        ...resolveSingleEliminationAdvancementParticipantsSV({
          ref: SLOT.playerBRef!,
          teamLabel: 'B',
          registrationById: REGISTRATION_BY_ID,
        }),
      ];

      const CREATED_MATCH = await _tx.match.create({
        data: {
          sportId: _input.currentMatch.sportId,
          categoryId: _input.currentMatch.categoryId,
          organizerUserId: _input.currentMatch.organizerUserId,
          tournamentId: _input.tournamentId,
          type: _input.currentMatch.type as never,
          status: 'SCHEDULED',
          maxParticipants: PARTICIPANTS.length,
          formatParameters: {
            scheduleKey: SCHEDULE.scheduleKey,
            roundNumber: SLOT.roundNumber,
            matchNumber: SLOT.matchNumber,
          } as never,
          participants: {
            create: PARTICIPANTS.map((_p) => ({
              ...(_p.userId !== null ? { userId: _p.userId } : {}),
              tournamentRegistrationId: _p.tournamentRegistrationId,
              ...(_p.teamLabel !== null ? { teamLabel: _p.teamLabel } : {}),
            })),
          },
        },
      });
      CREATED_MATCH_IDS.push(CREATED_MATCH.id);
    }

    return CREATED_MATCH_IDS;
  }

  /**
   * Refs de avance (`winnerRef`/`loserRef`, un `TournamentRegistration.id`) de
   * cada partido ya jugado del cuadro, incluido el recién escrito arriba en
   * esta misma transacción. Agrupa los `scores` por lado (`teamLabel` o, en
   * singles, el propio `tournamentRegistrationId`) sumando puntos — nunca
   * compara filas individuales (mismo motivo que S7b: duplas). Un partido sin
   * resultado, o empatado (no debería ocurrir en SE, ya rechazado al cargar),
   * no aporta ref.
   */
  private async _listPlayedSingleEliminationResultsSV(
    _tx: PrismaTransactionClientSV,
    _input: { tournamentId: string; scheduleKey: string },
  ): Promise<SingleEliminationRecordedResultSV[]> {
    const MATCHES = await _tx.match.findMany({
      where: {
        tournamentId: _input.tournamentId,
        formatParameters: { path: ['scheduleKey'], equals: _input.scheduleKey },
      },
      select: {
        formatParameters: true,
        participants: {
          select: { userId: true, teamLabel: true, tournamentRegistrationId: true },
        },
        results: { take: 1, select: { scores: { select: { userId: true, points: true } } } },
      },
    });

    const RESULTS: SingleEliminationRecordedResultSV[] = [];
    for (const MATCH of MATCHES) {
      const SCORES = MATCH.results[0]?.scores ?? [];
      if (SCORES.length === 0) continue;

      const SIDE_KEY_BY_USER_ID = new Map<string, string>();
      const REGISTRATION_REF_BY_SIDE_KEY = new Map<string, string>();
      for (const P of MATCH.participants) {
        if (P.tournamentRegistrationId === null) continue;
        const SIDE_KEY = P.teamLabel ?? P.tournamentRegistrationId;
        if (P.userId !== null) SIDE_KEY_BY_USER_ID.set(P.userId, SIDE_KEY);
        if (!REGISTRATION_REF_BY_SIDE_KEY.has(SIDE_KEY)) {
          REGISTRATION_REF_BY_SIDE_KEY.set(SIDE_KEY, P.tournamentRegistrationId);
        }
      }

      const TOTAL_BY_SIDE_KEY = new Map<string, number>();
      for (const SCORE of SCORES) {
        const SIDE_KEY = SIDE_KEY_BY_USER_ID.get(SCORE.userId);
        if (SIDE_KEY === undefined) continue;
        TOTAL_BY_SIDE_KEY.set(SIDE_KEY, (TOTAL_BY_SIDE_KEY.get(SIDE_KEY) ?? 0) + SCORE.points);
      }

      const ENTRIES = [...TOTAL_BY_SIDE_KEY.entries()];
      if (ENTRIES.length < 2) continue;
      const MAX = Math.max(...ENTRIES.map(([, _total]) => _total));
      const WINNERS = ENTRIES.filter(([, _total]) => _total === MAX);
      if (WINNERS.length !== 1) continue;

      const WINNER_SIDE_KEY = WINNERS[0]![0];
      const LOSER_ENTRY = ENTRIES.find(([_sideKey]) => _sideKey !== WINNER_SIDE_KEY);
      const WINNER_REF = REGISTRATION_REF_BY_SIDE_KEY.get(WINNER_SIDE_KEY);
      const LOSER_REF = LOSER_ENTRY !== undefined ? REGISTRATION_REF_BY_SIDE_KEY.get(LOSER_ENTRY[0]) : undefined;
      if (WINNER_REF === undefined || LOSER_REF === undefined) continue;

      const PARAMS = MATCH.formatParameters as { roundNumber: number; matchNumber: number };
      RESULTS.push({
        roundNumber: PARAMS.roundNumber,
        matchNumber: PARAMS.matchNumber,
        winnerRef: WINNER_REF,
        loserRef: LOSER_REF,
      });
    }

    return RESULTS;
  }

  async listMatchParticipantSidesSV(_matchId: string): Promise<MatchParticipantSideLookupSV[]> {
    const PARTICIPANTS = await PRISMA.matchParticipant.findMany({
      where: { matchId: _matchId },
      select: { userId: true, teamLabel: true },
    });
    return PARTICIPANTS.map((_p) => ({ userId: _p.userId, teamLabel: _p.teamLabel }));
  }

  async listTournamentMatchStatesSV(_input: {
    tournamentId: string;
    scheduleKey: string;
  }): Promise<TournamentMatchStateSV[]> {
    //? Una sola consulta trae Match + participantes + resultado (con sus
    //? scores) de todo el calendario: nunca N+1 por slot del cuadro.
    const MATCHES = await PRISMA.match.findMany({
      where: {
        tournamentId: _input.tournamentId,
        formatParameters: { path: ['scheduleKey'], equals: _input.scheduleKey },
      },
      select: {
        id: true,
        status: true,
        formatParameters: true,
        participants: {
          select: { userId: true, teamLabel: true, tournamentRegistrationId: true },
        },
        results: {
          take: 1,
          select: { scores: { select: { userId: true, points: true } } },
        },
      },
    });

    return MATCHES.map((_match) => {
      const PARAMS = _match.formatParameters as {
        roundNumber: number;
        matchNumber: number;
      };

      return {
        roundNumber: PARAMS.roundNumber,
        matchNumber: PARAMS.matchNumber,
        matchId: _match.id,
        matchStatus: _match.status,
        sides: groupMatchParticipantsBySideSV(
          _match.participants.map((_p) => ({
            userId: _p.userId,
            teamLabel: _p.teamLabel,
            tournamentRegistrationId: _p.tournamentRegistrationId ?? _p.userId ?? '',
          })),
        ),
        scores: (_match.results[0]?.scores ?? []).map((_s) => ({
          userId: _s.userId,
          points: _s.points,
        })),
      };
    });
  }
}
