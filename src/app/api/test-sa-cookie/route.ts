import { NextResponse } from 'next/server';
import { testSetCookie } from '@/app/actions/test-sa-cookie';

export async function GET(req: Request) {
  await testSetCookie();
  return NextResponse.redirect(new URL('/?tested=1', req.url));
}
