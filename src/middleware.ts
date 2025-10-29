
import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

const AUTH_ROUTES = ['/login', '/signup'];
const PROTECTED_ROUTES = ['/create', '/drafts', '/learning', '/activity', '/profile', '/settings', '/onboarding'];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (sessionCookie) {
    // User is authenticated
    if (isAuthRoute) {
        // Allow user to proceed to the login page if they're navigating there directly.
        // This is a special case to handle expired sessions where the user wants to re-login.
        // The page logic on /login will handle the case where a user with a *valid* session lands there.
        return NextResponse.next();
    }
    // For all other routes, allow access.
    return NextResponse.next();
  } else {
    // User is not authenticated
    if (isProtectedRoute) {
        // Redirect unauthenticated users from protected routes to the login page.
        return NextResponse.redirect(new URL('/login', request.url));
    }
    // Allow access to public and other auth routes (like /signup).
    return NextResponse.next();
  }
}

// We configure the matcher to run on all paths except for API routes and static assets.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
