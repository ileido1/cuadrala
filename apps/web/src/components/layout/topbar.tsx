'use client';

import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useVenue } from '~/contexts/venue-context';

// Map pathname to page titles
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Resumen de actividad' },
  '/dashboard/courts': { title: 'Mis Canchas', subtitle: 'Gestiona tus canchas' },
  '/dashboard/schedule': { title: 'Reservas', subtitle: 'Horario de reservas' },
  '/dashboard/payments': { title: 'Pagos', subtitle: 'Historial de pagos' },
  '/dashboard/settings': { title: 'Configuración', subtitle: 'Ajustes del club' },
  '/dashboard/profile': { title: 'Mi Perfil', subtitle: 'Datos personales' },
  '/dashboard/matches': { title: 'Partidos', subtitle: 'Partidos programados' },
  '/dashboard/tournaments': { title: 'Torneos', subtitle: 'Gestión de torneos' },
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { currentVenue } = useVenue();

  // Get page info from pathname, with fallback
  const pageInfo = PAGE_TITLES[pathname] ?? { title: currentVenue?.name ?? 'Sede', subtitle: 'Panel de control' };

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 sm:h-20 px-4 sm:px-6 lg:px-8 bg-surface border-b border-outline shadow-sm">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2.5 -ml-2 rounded-xl text-secondary-600 hover:bg-surface-container hover:text-secondary-900 transition-colors lg:hidden"
        aria-label="Abrir menú"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title / breadcrumb */}
      <div className="flex-1 min-w-0 ml-2 sm:ml-4">
        <h1 className="text-base sm:text-lg font-semibold text-secondary-900 truncate">
          {pageInfo.title}
        </h1>
        <p className="text-xs text-secondary-500 hidden sm:block">
          {pageInfo.subtitle}
        </p>
      </div>

      {/* Right side: actions + user */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search button */}
        <button
          type="button"
          className="p-2.5 rounded-xl text-secondary-600 hover:bg-surface-container hover:text-secondary-900 transition-colors"
          aria-label="Buscar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative p-2.5 rounded-xl text-secondary-600 hover:bg-surface-container hover:text-secondary-900 transition-colors"
          aria-label="Notificaciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-surface" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-outline" />

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-secondary-900">Admin</p>
            <p className="text-xs text-secondary-500">{currentVenue?.name ? `admin@${currentVenue.name.toLowerCase().replace(/\s+/g, '')}.com` : 'admin@cuadrala.com'}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-outline" />

        {/* Logout button */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-600 rounded-xl hover:bg-surface-container hover:text-secondary-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
