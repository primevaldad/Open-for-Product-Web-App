
import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session.server';

export async function POST() {
  try {
    // clearSession handles revoking tokens and clearing the session cookie.
    await clearSession();
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in logout route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
