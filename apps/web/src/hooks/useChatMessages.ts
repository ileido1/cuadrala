import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '~/lib/api-client';
import type { ChatMessage } from '~/types/api';

interface ChatMessagesResult {
  items: ChatMessage[];
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface UseChatMessagesOptions {
  contextType: 'match' | 'tournament';
  contextId: string;
}

export function useChatMessages({
  contextType,
  contextId,
}: UseChatMessagesOptions): ChatMessagesResult {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchMessages = useCallback(
    async (params?: { limit?: number; cursorCreatedAt?: string | null }) => {
      try {
        const response =
          contextType === 'match'
            ? await apiClient.matches.chat.messages(contextId, { limit: params?.limit, cursorCreatedAt: params?.cursorCreatedAt ?? undefined })
            : await apiClient.tournaments.chat.messages(contextId, { limit: params?.limit, cursorCreatedAt: params?.cursorCreatedAt ?? undefined });

        const data = response.data;

        // Support { items, nextCursorCreatedAt } envelope
        const fetchedItems: ChatMessage[] = data.items ?? data.messages ?? data.data ?? [];
        const nextCursor: string | null =
          data.nextCursorCreatedAt ?? data.nextCursor ?? null;

        return { items: fetchedItems, nextCursor };
      } catch {
        throw new Error('No se pudieron cargar los mensajes');
      }
    },
    [contextType, contextId]
  );

  // Carga inicial al montar
  useEffect(() => {
    const doLoad = async () => {
      setLoading(true);
      setError(null);
      try {
        const { items: fetchedItems, nextCursor: next } = await fetchMessages({
          limit: 50,
          cursorCreatedAt: null,
        });
        setItems(fetchedItems);
        setCursor(next);
        setHasMore(next !== null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los mensajes');
      } finally {
        setLoading(false);
      }
    };
    void doLoad();
  }, [fetchMessages]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: fetchedItems, nextCursor: next } = await fetchMessages({
        limit: 50,
        cursorCreatedAt: null,
      });
      setItems(fetchedItems);
      setCursor(next);
      setHasMore(next !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || cursor === null) return;

    setIsLoadingMore(true);
    try {
      const { items: fetchedItems, nextCursor: next } = await fetchMessages({
        limit: 50,
        cursorCreatedAt: cursor,
      });
      setItems((prev) => [...prev, ...fetchedItems]);
      setCursor(next);
      setHasMore(next !== null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar más mensajes');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchMessages, hasMore, isLoadingMore, cursor]);

  return {
    items,
    loading,
    error,
    loadMore,
    hasMore,
    isLoadingMore,
  };
}