import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      subscriptionType: string;
    } & Omit<DefaultSession['user'], 'id'>;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    subscriptionType?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  }
}