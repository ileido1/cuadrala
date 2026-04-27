import { AppError } from '../domain/errors/app_error.js';
import { findMatchWithParticipantsRepo } from '../infrastructure/repositories/match.repository.js';
import { listRankingSuggestionsRepo } from '../infrastructure/repositories/ranking.repository.js';
import { listUsersNotInRepo } from '../infrastructure/repositories/user.repository.js';

export type MatchmakingSuggestion = {
  userId: string;
  name: string;
  source: 'ranking' | 'directory';
  points?: number;
};

export async function getMatchmakingSuggestionsSV(
  _matchId: string,
  _limit: number,
): Promise<MatchmakingSuggestion[]> {
  const MATCH = await findMatchWithParticipantsRepo(_matchId);
  if (!MATCH) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }

  const EXCLUDE_IDS = MATCH.participants.map((_p) => _p.userId);
  const CAP = Math.min(Math.max(_limit, 1), 50);

  const FROM_RANKING = await listRankingSuggestionsRepo(MATCH.categoryId, EXCLUDE_IDS, CAP);

  const OUT: MatchmakingSuggestion[] = FROM_RANKING.map((_r) => ({
    userId: _r.userId,
    name: _r.name,
    source: 'ranking',
    points: _r.points,
  }));

  if (OUT.length >= CAP) {
    return OUT.slice(0, CAP);
  }

  const REMAINING = CAP - OUT.length;
  const ALREADY = new Set<string>([...EXCLUDE_IDS, ...OUT.map((_o) => _o.userId)]);
  const FALLBACK = await listUsersNotInRepo([...ALREADY], REMAINING);

  for (const _u of FALLBACK) {
    OUT.push({
      userId: _u.id,
      name: _u.name,
      source: 'directory',
    });
  }

  return OUT;
}
