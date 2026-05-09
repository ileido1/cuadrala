import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';
import ShellClient from '~/components/layout/shell-client';
import { VenueProvider } from '~/contexts/venue-context';

export const metadata: Metadata = {
  title: 'Dashboard - Cuadrala',
  description: 'Panel de administración',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <VenueProvider>
        <ShellClient>{children}</ShellClient>
      </VenueProvider>
    </SessionProvider>
  );
}
