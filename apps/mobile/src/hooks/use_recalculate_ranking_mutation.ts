import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recalculateRanking } from '../infrastructure/api/ranking.api';
import { QUERY_KEYS } from '../infrastructure/api/query_keys';

export function useRecalculateRankingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_categoryId: string) => recalculateRanking(_categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.health });
    },
  });
}
