import type { HealthPayload } from './api_types';
import { requestJson } from './api_client';

export async function fetchHealth(): Promise<HealthPayload> {
  return requestJson<HealthPayload>('/health', { method: 'GET' });
}
