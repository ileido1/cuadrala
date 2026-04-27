export type HealthPayload = {
  status: string;
  service: string;
  timestamp: string;
};

export type ApiWrappedSuccess<TData> = {
  success: true;
  message: string;
  data: TData;
};

export type ApiErrorPayload = {
  success: false;
  code: string;
  message: string;
  details?: unknown;
};

export type CreateAmericanoResult = {
  matchId: string;
  status: string;
  type: string;
  participantCount: number;
};

export type MatchmakingSuggestion = {
  userId: string;
  name: string;
  source: 'ranking' | 'directory';
  points?: number;
};

export type RecalculateRankingResult = {
  categoryId: string;
  entriesUpdated: number;
};
