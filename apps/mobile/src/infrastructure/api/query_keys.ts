export const QUERY_KEYS = {
  health: ['health'] as const,
  matchmakingSuggestions: (_matchId: string, _limit: number) =>
    ['matchmaking', 'suggestions', _matchId, _limit] as const,
};
