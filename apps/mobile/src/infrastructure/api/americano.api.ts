import type { ApiWrappedSuccess, CreateAmericanoResult } from './api_types';
import { requestJson } from './api_client';

export type CreateAmericanoBody = {
  categoryId: string;
  participantUserIds: string[];
  courtId?: string;
  tournamentId?: string;
  scheduledAt?: string;
};

export async function createAmericano(_body: CreateAmericanoBody): Promise<CreateAmericanoResult> {
  const RESPONSE = await requestJson<ApiWrappedSuccess<CreateAmericanoResult>>('/americanos', {
    method: 'POST',
    body: JSON.stringify(_body),
  });
  return RESPONSE.data;
}
