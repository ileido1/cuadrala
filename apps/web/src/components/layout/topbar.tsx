'use client';

import { signOut } from 'next-auth/react';
import { useVenue } from '~/contexts/venue-context';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { currentVenue } = useVenue();

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 sm:h-20 px-4 sm:px-6 lg:px-8 bg-surface border-b border-outline shadow-sm">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2.5 -ml-2 rounded-xl text-secondary-600 hover:bg-surface-container hover:text-secondary-900 transition-colors lg:hidden"
        aria-label="Abrir menú"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Page title / Venue selector */}
      <div className="flex-1 min-w-0 ml-2 sm:ml-4">
        <h1 className="text-base sm:text-lg font-semibold text-secondary-900 truncate">
          {currentVenue?.name ?? 'Sede'}
        </h1>
      </div>

      {/* Right side: user avatar + logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* User avatar */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-secondary-900">Admin</p>
            <p className="text-xs text-secondary-500">admin@cuadrala.com</p>
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
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
            />
          </svg>
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}