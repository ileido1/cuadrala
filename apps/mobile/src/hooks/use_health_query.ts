import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from '../infrastructure/api/health.api';
import { QUERY_KEYS } from '../infrastructure/api/query_keys';

export function useHealthQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: fetchHealth,
  });
}
