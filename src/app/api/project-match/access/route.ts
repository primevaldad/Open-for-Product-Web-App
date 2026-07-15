import { NextResponse } from 'next/server';
import { consumeProjectMatchThreadToken } from '@/app/actions/project-match';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const threadId = searchParams.get('threadId');

  if (!token) {
    return NextResponse.redirect(new URL('/match/thanks?error=invalid-link', request.url), { status: 303 });
  }

  const result = await consumeProjectMatchThreadToken(token);
  if (!result.success || !result.data?.threadId) {
    const url = new URL('/match/thanks', request.url);
    url.searchParams.set('error', 'access-denied');
    if (threadId) {
      url.searchParams.set('threadId', threadId);
    }
    return NextResponse.redirect(url, { status: 303 });
  }

  const redirectUrl = new URL(`/match/${result.data.threadId}`, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('ofp_project_match_sessions');
  
  if (sessionCookie) {
    const maxAge = 60 * 60 * 24 * 7;
    response.headers.append('Set-Cookie', `${sessionCookie.name}=${sessionCookie.value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
  }

  return response;
}
