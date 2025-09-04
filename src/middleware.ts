import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session');
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // If there's no session and the user is trying to access a protected page
  if (!session && !isAuthPage && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If there is a session and the user is on an auth page, redirect to home
  if (session && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
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
