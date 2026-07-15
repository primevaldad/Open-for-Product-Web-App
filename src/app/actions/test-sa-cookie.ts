'use server';
import { cookies } from 'next/headers';
export async function testSetCookie() {
  const c = await cookies();
  c.set('sa_test_cookie', 'sa_value', { path: '/' });
}
