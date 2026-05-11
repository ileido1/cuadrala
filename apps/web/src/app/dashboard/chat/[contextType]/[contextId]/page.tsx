'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatMessages } from '~/hooks/useChatMessages';
import { ChatView } from '~/components/chat/ChatView';

export default function ChatPage() {
  const params = useParams();
  const contextType = params.contextType as string;
  const contextId = params.contextId as string;

  const {
    items,
    loading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useChatMessages({ contextType, contextId });
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [items.length]);

  const contextLabel =
    contextType === 'match' ? 'Partido' : 'Torneo';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Chat — {contextLabel}
        </h1>
        <p className="text-gray-500 mt-1">
          Vista de solo lectura
        </p>
      </div>

      {/* Chat container */}
      <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        <ChatView
          items={items}
          loading={loading}
          error={error}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}