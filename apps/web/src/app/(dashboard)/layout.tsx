import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Cuadrala',
  description: 'Panel de administración',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}