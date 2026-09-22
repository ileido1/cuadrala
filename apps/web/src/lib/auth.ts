import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { authorizeCredentials } from './social-login-authorize';

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      //? Delegates to a next-auth-free module so the authorize logic
      //? (password login + social-login token-verification bridge) stays
      //? unit-testable. See lib/social-login-authorize.ts.
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken ?? '';
        token.refreshToken = (user as { refreshToken?: string }).refreshToken ?? '';
        token.expiresIn = (user as { expiresIn?: number }).expiresIn ?? 900;
        token.id = user.id;
        token.email = user.email ?? '';
        token.name = user.name ?? '';
        token.subscriptionType = (user as { subscriptionType?: string }).subscriptionType ?? 'free';
        token.onboardingComplete = (user as { onboardingComplete?: boolean }).onboardingComplete ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          subscriptionType: token.subscriptionType as string,
          onboardingComplete: token.onboardingComplete as boolean,
        },
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        expiresIn: token.expiresIn as number,
      };
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'development-secret-change-in-production',
};

const authResult = NextAuth(authConfig);

export default authResult;
export const { handlers, auth, signIn, signOut } = authResult;