import type { ApiWrappedSuccess, MatchmakingSuggestion } from './api_types';
import { requestJson } from './api_client';

export async function fetchMatchmakingSuggestions(
  _matchId: string,
  _limit: number,
): Promise<MatchmakingSuggestion[]> {
  const QUERY = new URLSearchParams({ limit: String(_limit) });
  const PATH = `/matchmaking/${encodeURIComponent(_matchId)}/suggestions?${QUERY.toString()}`;
  const RESPONSE = await requestJson<ApiWrappedSuccess<{ suggestions: MatchmakingSuggestion[] }>>(PATH, {
    method: 'GET',
  });
  return RESPONSE.data.suggestions;
}
