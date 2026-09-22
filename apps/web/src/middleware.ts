import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard', '/profile', '/settings', '/courts', '/schedule', '/payments', '/tournaments'];
const onboardingRoutes = ['/onboarding'];
const authRoutes = ['/login', '/register'];

async function fetchUserProfile(userId: string, accessToken: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1/';

    const response = await fetch(`${API_URL}${API_BASE_PATH}users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.onboardingComplete ?? false;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // 1. Unauthenticated users
  if (!token) {
    // Redirect to login if trying to access protected routes
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}`, request.url),
      );
    }
    // Redirect to dashboard if trying to access onboarding without auth
    if (onboardingRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Allow access to auth routes and public pages
    return NextResponse.next();
  }

  // 2. Authenticated users - check onboarding status
  let onboardingComplete = (token as any)?.onboardingComplete;

  // If onboarding status is unknown, fetch from user profile
  if (onboardingComplete === undefined || onboardingComplete === null) {
    const accessToken = (token as any)?.accessToken;
    if (accessToken && (token as any)?.sub) {
      const status = await fetchUserProfile((token as any).sub, accessToken);
      if (status !== null) {
        onboardingComplete = status;
      } else {
        // Default to false (incomplete) if we can't determine
        onboardingComplete = false;
      }
    }
  }

  // 3. Handle routing based on onboarding status
  if (!onboardingComplete) {
    // Onboarding not complete
    if (onboardingRoutes.some((route) => pathname.startsWith(route))) {
      // Allow access to onboarding
      return NextResponse.next();
    }

    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect protected routes to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    if (authRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect auth routes to onboarding if logged in but not onboarded
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  } else {
    // Onboarding complete
    if (onboardingRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect onboarding route to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      // Redirect auth routes to dashboard if already logged in and onboarded
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
