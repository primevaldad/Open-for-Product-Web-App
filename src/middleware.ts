
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

const AUTH_ROUTES = ['/login', '/signup'];
const PROTECTED_ROUTES = ['/home', '/create', '/drafts', '/learning', '/activity', '/profile', '/settings', '/onboarding'];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (sessionCookie) {
    if (isAuthRoute) {
      // Redirect authenticated users from login/signup to the home page
      return NextResponse.redirect(new URL('/home', request.url));
    }
    // Allow access to all other routes for authenticated users
    return NextResponse.next();
  } else {
    // User is not authenticated
    if (isProtectedRoute) {
        // Redirect unauthenticated users from protected routes to the login page
        return NextResponse.redirect(new URL('/login', request.url));
    }
    // Allow access to public and auth routes
    return NextResponse.next();
  }
}

// We configure the matcher to run on all paths except for API routes and static assets.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
