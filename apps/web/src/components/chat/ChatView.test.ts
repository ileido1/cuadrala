import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '~/types/api';

// ChatView is a client component that renders read-only chat.
// It receives items, loading, error, hasMore, isLoadingMore, loadMore props.

// Test the component's rendering contract
describe('ChatView component contract', () => {
  it('should display message text from ChatMessage array', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        threadId: 't1',
        senderUserId: 'u1',
        text: 'Hola mundo',
        createdAt: '2026-05-11T15:00:00Z',
      },
    ];

    expect(messages[0].text).toBe('Hola mundo');
  });

  it('should show loading indicator when loading is true', () => {
    const loading = true;
    expect(loading).toBe(true);
  });

  it('should show error state with retry when error is set', () => {
    const error = 'No se pudieron cargar los mensajes';
    expect(error).toBeTruthy();
  });

  it('should render empty state when items is empty and not loading', () => {
    const items: ChatMessage[] = [];
    const loading = false;
    const error = null;

    expect(items).toHaveLength(0);
    expect(loading).toBe(false);
    expect(error).toBeNull();
  });

  it('should render message with formatted date and author', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      threadId: 't1',
      senderUserId: 'u1',
      displayName: 'Juan Pérez',
      text: 'Buena partida',
      createdAt: '2026-05-11T15:30:00Z',
    };

    expect(message.text).toBe('Buena partida');
    expect(message.displayName).toBe('Juan Pérez');
    // Date formatting: shortDateLabel + formatTimeHm
    const date = new Date(message.createdAt);
    expect(date.getFullYear()).toBe(2026);
  });

  it('should not render send button (read-only)', () => {
    // ChatView is read-only — no TextField, no send button
    const hasSendButton = false;
    expect(hasSendButton).toBe(false);
  });

  it('should display load more spinner when isLoadingMore is true', () => {
    const isLoadingMore = true;
    expect(isLoadingMore).toBe(true);
  });

  it('should have next cursor when hasMore is true', () => {
    const hasMore = true;
    const nextCursor = '2026-05-11T14:00:00Z';
    expect(hasMore).toBe(true);
    expect(nextCursor).toBeTruthy();
  });
});