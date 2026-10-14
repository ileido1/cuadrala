import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ShellClient from './shell-client';
import Sidebar from './sidebar';
import Topbar from './topbar';
import { useVenue } from '~/contexts/venue-context';
import { useSession } from 'next-auth/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('~/contexts/venue-context', () => ({
  useVenue: vi.fn(),
}));

const VENUE = { id: 'venue-1', name: 'Club Cuádrala' };
const SECOND_VENUE = { id: 'venue-2', name: 'Club Norte' };

describe('dashboard shell', () => {
  const reloadVenues = vi.fn();
  const setCurrentVenue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Carlos Hernández',
          email: 'carlos@example.com',
          subscriptionType: 'free',
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 900,
        expires: '2099-01-01',
      },
      status: 'authenticated',
      update: vi.fn(),
    });
    vi.mocked(useVenue).mockReturnValue({
      venues: [VENUE] as never,
      currentVenue: VENUE as never,
      setCurrentVenue,
      reloadVenues,
      isLoading: false,
      error: null,
    });
  });

  it('should wait for the venue before rendering dashboard content', () => {
    vi.mocked(useVenue).mockReturnValue({
      venues: [],
      currentVenue: null,
      setCurrentVenue,
      reloadVenues,
      isLoading: true,
      error: null,
    });

    render(<ShellClient><div>Private dashboard</div></ShellClient>);

    expect(screen.getByText('Cargando sede...')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('should expose a retry action when venues cannot load', () => {
    vi.mocked(useVenue).mockReturnValue({
      venues: [],
      currentVenue: null,
      setCurrentVenue,
      reloadVenues,
      isLoading: false,
      error: 'No se pudieron cargar las sedes',
    });

    render(<ShellClient><div>Private dashboard</div></ShellClient>);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(reloadVenues).toHaveBeenCalledOnce();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('should show an explicit state when the user has no venues', () => {
    vi.mocked(useVenue).mockReturnValue({
      venues: [],
      currentVenue: null,
      setCurrentVenue,
      reloadVenues,
      isLoading: false,
      error: null,
    });

    render(<ShellClient><div>Private dashboard</div></ShellClient>);

    expect(screen.getByText('No tenés sedes asignadas')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('should render a venue selector only when multiple venues are available', () => {
    vi.mocked(useVenue).mockReturnValue({
      venues: [VENUE, SECOND_VENUE] as never,
      currentVenue: VENUE as never,
      setCurrentVenue,
      reloadVenues,
      isLoading: false,
      error: null,
    });

    render(<Sidebar isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Sede activa'), {
      target: { value: SECOND_VENUE.id },
    });

    expect(setCurrentVenue).toHaveBeenCalledWith(SECOND_VENUE);
    expect(screen.queryByText('Club Palermo')).not.toBeInTheDocument();
  });

  it('should show the signed-in user and no inactive topbar actions', () => {
    render(<Topbar onMenuClick={vi.fn()} />);

    expect(screen.getByText('Carlos Hernández')).toBeInTheDocument();
    expect(screen.getByText('carlos@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notificaciones' })).not.toBeInTheDocument();
  });
});
