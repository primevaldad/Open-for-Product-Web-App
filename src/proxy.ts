
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // For all incoming requests, simply rewrite the request to its original URL.
  // This acts as a universal "pass-through" mechanism, allowing Next.js to handle
  // all routing and page rendering. The responsibility for showing, hiding, or
  // "masking" content is now entirely within each page component itself.
  return NextResponse.rewrite(request.nextUrl);
}

// We configure the matcher to run on all paths except for API routes and static assets.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
