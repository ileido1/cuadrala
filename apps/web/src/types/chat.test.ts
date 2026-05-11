import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '~/types/api';

describe('ChatMessage DTO', () => {
  describe('cursor pagination shape', () => {
    it('should have required fields for display', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        threadId: 'thread-1',
        senderUserId: 'user-1',
        text: 'Hola mundo',
        createdAt: '2026-05-11T15:30:00Z',
      };

      expect(message.id).toBe('msg-1');
      expect(message.threadId).toBe('thread-1');
      expect(message.senderUserId).toBe('user-1');
      expect(message.text).toBe('Hola mundo');
      expect(message.createdAt).toBe('2026-05-11T15:30:00Z');
    });

    it('should accept optional displayName field', () => {
      const message: ChatMessage = {
        id: 'msg-2',
        threadId: 'thread-1',
        senderUserId: 'user-2',
        text: 'Buena partida',
        createdAt: '2026-05-11T16:00:00Z',
        displayName: 'Juan Pérez',
      };

      expect(message.displayName).toBe('Juan Pérez');
    });
  });

  describe('ChatMessagesPage cursor shape', () => {
    it('should have items array and optional cursor', () => {
      interface ChatMessagesPage {
        items: ChatMessage[];
        nextCursorCreatedAt?: string | null;
      }

      const page: ChatMessagesPage = {
        items: [
          {
            id: 'msg-1',
            threadId: 'thread-1',
            senderUserId: 'user-1',
            text: 'Primero',
            createdAt: '2026-05-11T15:00:00Z',
          },
        ],
        nextCursorCreatedAt: '2026-05-11T14:00:00Z',
      };

      expect(page.items).toHaveLength(1);
      expect(page.nextCursorCreatedAt).toBe('2026-05-11T14:00:00Z');
    });

    it('should allow null cursor when no more pages', () => {
      interface ChatMessagesPage {
        items: ChatMessage[];
        nextCursorCreatedAt?: string | null;
      }

      const page: ChatMessagesPage = {
        items: [],
        nextCursorCreatedAt: null,
      };

      expect(page.items).toHaveLength(0);
      expect(page.nextCursorCreatedAt).toBeNull();
    });
  });
});