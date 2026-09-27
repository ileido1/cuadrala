import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard', '/profile', '/settings', '/courts', '/schedule', '/payments', '/tournaments'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === 'https:',
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
    // Allow access to auth routes and public pages
    return NextResponse.next();
  }

  // Authenticated web users always enter the backoffice dashboard. The
  // onboarding flow belongs to the mobile player app, not this venue panel.
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
