'use client';

import type { ChatMessage } from '~/types/api';
import { ChatMessageList } from './ChatMessageList';

interface ChatViewProps {
  items: ChatMessage[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ChatView({
  items,
  loading,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ChatViewProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aún no hay mensajes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ChatMessageList items={items} />
      </div>

      {/* Load more spinner */}
      {isLoadingMore && (
        <div className="flex justify-center py-3">
          <div className="h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Load more button */}
      {!isLoadingMore && hasMore && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onLoadMore}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cargar más mensajes
          </button>
        </div>
      )}

      {/* No more messages indicator */}
      {!hasMore && items.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">No hay más mensajes</p>
        </div>
      )}
    </div>
  );
}