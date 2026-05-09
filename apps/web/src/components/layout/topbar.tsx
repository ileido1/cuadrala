'use client';

import { signOut } from 'next-auth/react';
import { useVenue } from '~/contexts/venue-context';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { currentVenue } = useVenue();

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white border-b border-gray-200">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2 mr-4 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
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

      {/* Venue name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 truncate">
          {currentVenue?.name ?? 'Sede'}
        </span>
      </div>

      {/* Right side: user info + logout */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100"
        >
          <svg
            className="w-4 h-4"
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
