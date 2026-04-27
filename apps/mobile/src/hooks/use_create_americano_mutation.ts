import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateAmericanoBody } from '../infrastructure/api/americano.api';
import { createAmericano } from '../infrastructure/api/americano.api';
import { QUERY_KEYS } from '../infrastructure/api/query_keys';

export function useCreateAmericanoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_body: CreateAmericanoBody) => createAmericano(_body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.health });
    },
  });
}
