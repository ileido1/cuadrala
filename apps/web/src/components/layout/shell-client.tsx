'use client';

import { useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useVenue } from '~/contexts/venue-context';
import Sidebar from './sidebar';
import Topbar from './topbar';

interface ShellClientProps {
  children: ReactNode;
}

export default function ShellClient({ children }: ShellClientProps) {
  const { status } = useSession();
  const { currentVenue, venues, isLoading, error, reloadVenues } = useVenue();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-secondary-500">
            {status === 'loading' ? 'Cargando...' : 'Cargando sede...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="section-heading">No pudimos cargar tus sedes</h1>
          <p className="mt-2 text-body">Revisá la conexión e intentá nuevamente.</p>
          <button type="button" onClick={() => void reloadVenues()} className="btn btn-primary mt-6">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (venues.length === 0 || !currentVenue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="section-heading">No tenés sedes asignadas</h1>
          <p className="mt-2 text-body">
            Tu cuenta necesita una sede para acceder al panel.
          </p>
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
