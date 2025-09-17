
import { NextResponse, type NextRequest } from 'next/server';
import { createSession, clearSession } from '@/lib/session.server';

/**
 * API route to create a user session.
 * Expects a POST request with a JSON body containing the Firebase ID token.
 */
export async function POST(request: NextRequest) {
  try {
    const reqBody = (await request.json()) as { idToken: string };
    const idToken = reqBody.idToken;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // createSession handles token verification, cookie creation, and setting it.
    await createSession(idToken);

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Error in session POST route:', error);
    const errorMessage =
      error.message || 'An unknown error occurred during session creation.';
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * API route to delete a user session (logout).
 * Expects a DELETE request.
 */
export async function DELETE() {
  try {
    // clearSession handles cookie removal and token revocation.
    await clearSession();
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Error in session DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
