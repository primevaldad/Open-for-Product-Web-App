
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

const SESSION_COOKIE_NAME = '__session';

const AUTH_ROUTES = ['/login', '/signup'];
const PUBLIC_ROUTES = ['/'];
// Onboarding is a protected route, but we need to allow access to it
// for authenticated users who are not yet onboarded.
const PROTECTED_ROUTES = ['/home', '/create', '/drafts', '/learning', '/activity', '/profile', '/settings', '/onboarding'];


async function verifySession(sessionCookie: string): Promise<string | null> {
  try {
    const adminAuth = getAuth(adminApp);
    // The `true` argument checks for a revoked session.
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims.uid;
  } catch (error) {
    // Session cookie is invalid, expired, or revoked.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Immediately allow requests for static assets and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const userId = sessionCookie ? await verifySession(sessionCookie) : null;
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (userId) {
    // User is authenticated
    if (isAuthRoute) {
      // Redirect authenticated users from login/signup to the home page
      return NextResponse.redirect(new URL('/home', request.url));
    }
    // Allow access to all other routes (including protected ones like /onboarding)
    return NextResponse.next();
  } else {
    // User is not authenticated
    if (isProtectedRoute) {
        // Redirect unauthenticated users from protected routes to the login page
        const response = NextResponse.redirect(new URL('/login', request.url));
        // Clear any invalid cookie they might have
        response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });
        return response;
    }
    // Allow access to public and auth routes
    return NextResponse.next();
  }
}

// We configure the matcher to run on all paths except for specific static assets.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
