import type { ApiWrappedSuccess, RecalculateRankingResult } from './api_types';
import { requestJson } from './api_client';

export async function recalculateRanking(_categoryId: string): Promise<RecalculateRankingResult> {
  const PATH = `/ranking/recalculate/${encodeURIComponent(_categoryId)}`;
  const RESPONSE = await requestJson<ApiWrappedSuccess<RecalculateRankingResult>>(PATH, {
    method: 'POST',
  });
  return RESPONSE.data;
}
