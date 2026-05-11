'use client';

import type { ChatMessage } from '~/types/api';

interface ChatMessageListProps {
  items: ChatMessage[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatMessageList({ items }: ChatMessageListProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((message) => (
        <div
          key={message.id}
          className="bg-gray-100 rounded-lg p-3"
          data-testid={`message-${message.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {message.displayName ?? message.senderUserId}
              </p>
              <p className="text-sm text-gray-700 mt-1 break-words">
                {message.text}
              </p>
            </div>
            <div className="flex flex-col items-end text-xs text-gray-400 shrink-0">
              <span>{formatDate(message.createdAt)}</span>
              <span>{formatTime(message.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}