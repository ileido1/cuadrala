import { useQuery } from '@tanstack/react-query';

import { fetchMatchmakingSuggestions } from '../infrastructure/api/matchmaking.api';
import { QUERY_KEYS } from '../infrastructure/api/query_keys';

export function useMatchmakingSuggestionsQuery(_matchId: string, _limit: number, _enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.matchmakingSuggestions(_matchId, _limit),
    queryFn: () => fetchMatchmakingSuggestions(_matchId, _limit),
    enabled: _enabled && _matchId.trim().length > 0,
  });
}
