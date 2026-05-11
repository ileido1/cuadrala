'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChatMessages } from '~/hooks/useChatMessages';
import { ChatView } from '~/components/chat/ChatView';

export default function ChatPage() {
  const params = useParams();
  const contextType = params.contextType as 'match' | 'tournament';
  const contextId = params.contextId as string;

  const {
    items,
    loading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useChatMessages({ contextType, contextId });

  useEffect(() => {
    if (items.length > 0) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [items.length]);

  const contextLabel = contextType === 'match' ? 'Partido' : 'Torneo';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="page-heading">
          Chat — {contextLabel}
        </h1>
        <p className="text-body mt-1">
          Vista de solo lectura
        </p>
      </div>

      {/* Chat container */}
      <div className="card overflow-hidden animate-fade-in stagger-1" style={{ height: 'calc(100vh - 220px)' }}>
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