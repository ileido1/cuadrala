'use client';

import { SessionProvider } from 'next-auth/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Session } from 'next-auth';

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Providers({ children, session }: ProvidersProps) {
  if (!googleClientId) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is not set');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <SessionProvider session={session}>{children}</SessionProvider>
    </GoogleOAuthProvider>
  );
}
