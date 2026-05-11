'use client';

import { useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from './sidebar';
import Topbar from './topbar';

interface ShellClientProps {
  children: ReactNode;
}

export default function ShellClient({ children }: ShellClientProps) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-secondary-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 lg:pl-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}