import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
        const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1/';

        try {
          const response = await fetch(`${API_URL}${API_BASE_PATH}auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          if (!data.success) {
            return null;
          }

          const { user, accessToken, refreshToken, expiresIn } = data.data;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionType: user.subscriptionType,
            accessToken,
            refreshToken,
            expiresIn,
          };
        } catch {
          return null;
        }
      },
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