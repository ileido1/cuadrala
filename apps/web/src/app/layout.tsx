import type { Metadata } from 'next';
import './globals.css';
import Providers from '~/lib/providers';

export const metadata: Metadata = {
  title: 'Cuadrala',
  description: 'Cuadrala Backoffice',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
