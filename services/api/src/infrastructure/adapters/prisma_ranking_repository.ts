import type { PrismaClient } from '../../generated/prisma/client.js';
import type { RankingRepository } from '../../domain/ports/ranking_repository.js';

import { PRISMA } from '../prisma_client.js';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function aggregateFromResultsSV(
  _results: {
    matchId: string;
    scores: { userId: string; points: number }[];
  }[],
): { userId: string; points: number; gamesPlayed: number }[] {
  const BY_USER = new Map<string, { points: number; matchIds: Set<string> }>();

  for (const _r of _results) {
    for (const _s of _r.scores) {
      const CUR = BY_USER.get(_s.userId) ?? { points: 0, matchIds: new Set<string>() };
      CUR.points += _s.points;
      CUR.matchIds.add(_r.matchId);
      BY_USER.set(_s.userId, CUR);
    }
  }

  return [...BY_USER.entries()].map(([_userId, _v]) => ({
    userId: _userId,
    points: _v.points,
    gamesPlayed: _v.matchIds.size,
  }));
}

async function recalculateInTxSV(
  _tx: TxClient,
  _categoryId: string,
): Promise<{ categoryId: string; entriesUpdated: number }> {
  const RESULTS = await _tx.matchResult.findMany({
    where: { match: { categoryId: _categoryId } },
    select: {
      matchId: true,
      scores: { select: { userId: true, points: true } },
    },
  });

  const AGG = aggregateFromResultsSV(RESULTS);

  await _tx.rankingEntry.deleteMany({ where: { categoryId: _categoryId } });
  if (AGG.length > 0) {
    await _tx.rankingEntry.createMany({
      data: AGG.map((_r) => ({
        categoryId: _categoryId,
        userId: _r.userId,
        points: _r.points,
        gamesPlayed: _r.gamesPlayed,
      })),
    });
  }

  return { categoryId: _categoryId, entriesUpdated: AGG.length };
}

export class PrismaRankingRepository implements RankingRepository {
  constructor(private readonly _prisma: PrismaClient = PRISMA) {}

  async recalculateByCategoryIdSV(_categoryId: string): Promise<{
    categoryId: string;
    entriesUpdated: number;
  }> {
    return this._prisma.$transaction(async (_tx) => recalculateInTxSV(_tx, _categoryId));
  }
}

