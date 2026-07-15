import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const c = await cookies();
  c.set('test_cookie', 'hello_world');
  return NextResponse.redirect(new URL('/?tested=1', req.url), { status: 303 });
}
