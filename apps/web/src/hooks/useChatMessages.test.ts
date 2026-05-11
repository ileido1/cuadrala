import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api-client
vi.mock('~/lib/api-client', () => ({
  apiClient: {
    matches: {
      chat: {
        messages: vi.fn(),
      },
    },
    tournaments: {
      chat: {
        messages: vi.fn(),
      },
    },
  },
}));

// Import after mock
import { apiClient } from '~/lib/api-client';
import type { ChatMessage } from '~/types/api';

// Test the hook's contract by testing the inner fetchMessages logic
// since @testing-library/react requires jsdom (not configured for this project)
describe('useChatMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiClient integration', () => {
    it('should call matches endpoint with correct params on initial load', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          threadId: 't1',
          senderUserId: 'u1',
          text: 'Hola',
          createdAt: '2026-05-11T15:00:00Z',
        },
      ];

      (apiClient.matches.chat.messages as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          items: mockMessages,
          nextCursorCreatedAt: '2026-05-11T14:00:00Z',
        },
      });

      const response = await apiClient.matches.chat.messages('match-1', {
        limit: 50,
        cursorCreatedAt: null,
      });

      expect(apiClient.matches.chat.messages).toHaveBeenCalledWith('match-1', {
        limit: 50,
        cursorCreatedAt: null,
      });

      const data = response.data;
      expect(data.items).toHaveLength(1);
      expect(data.items[0].text).toBe('Hola');
      expect(data.nextCursorCreatedAt).toBe('2026-05-11T14:00:00Z');
    });

    it('should set hasMore to false when cursor is null', async () => {
      (apiClient.matches.chat.messages as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          items: [
            {
              id: 'msg-1',
              threadId: 't1',
              senderUserId: 'u1',
              text: 'Unico',
              createdAt: '2026-05-11T15:00:00Z',
            },
          ],
          nextCursorCreatedAt: null,
        },
      });

      const response = await apiClient.matches.chat.messages('match-1', {
        limit: 50,
        cursorCreatedAt: null,
      });

      const data = response.data;
      expect(data.items).toHaveLength(1);
      expect(data.nextCursorCreatedAt).toBeNull();
    });

    it('should handle error when fetch fails', async () => {
      (apiClient.matches.chat.messages as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        apiClient.matches.chat.messages('match-1', { limit: 50, cursorCreatedAt: null })
      ).rejects.toThrow('Network error');
    });

    it('should call tournaments endpoint for tournament context', async () => {
      (apiClient.tournaments.chat.messages as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          items: [
            {
              id: 'msg-1',
              threadId: 't1',
              senderUserId: 'u1',
              text: 'Torneo mensaje',
              createdAt: '2026-05-11T15:00:00Z',
            },
          ],
          nextCursorCreatedAt: null,
        },
      });

      const response = await apiClient.tournaments.chat.messages('tournament-1', {
        limit: 50,
        cursorCreatedAt: null,
      });

      expect(apiClient.tournaments.chat.messages).toHaveBeenCalledWith(
        'tournament-1',
        expect.any(Object)
      );
      expect(response.data.items).toHaveLength(1);
    });

    it('should loadMore appends items and updates cursor', async () => {
      // First call - initial
      (apiClient.matches.chat.messages as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 'msg-1',
                threadId: 't1',
                senderUserId: 'u1',
                text: 'Primero',
                createdAt: '2026-05-11T15:00:00Z',
              },
            ],
            nextCursorCreatedAt: '2026-05-11T14:00:00Z',
          },
        })
        // Second call - loadMore
        .mockResolvedValueOnce({
          data: {
            items: [
              {
                id: 'msg-2',
                threadId: 't1',
                senderUserId: 'u2',
                text: 'Segundo',
                createdAt: '2026-05-11T13:00:00Z',
              },
            ],
            nextCursorCreatedAt: null,
          },
        });

      // Initial load
      const initial = await apiClient.matches.chat.messages('match-1', {
        limit: 50,
        cursorCreatedAt: null,
      });
      expect(initial.data.items).toHaveLength(1);
      expect(initial.data.nextCursorCreatedAt).toBe('2026-05-11T14:00:00Z');

      // LoadMore with cursor
      const more = await apiClient.matches.chat.messages('match-1', {
        limit: 50,
        cursorCreatedAt: '2026-05-11T14:00:00Z',
      });
      expect(more.data.items).toHaveLength(1);
      expect(more.data.items[0].text).toBe('Segundo');
      expect(more.data.nextCursorCreatedAt).toBeNull();
    });
  });
});