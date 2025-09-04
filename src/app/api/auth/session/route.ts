import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const reqBody = (await request.json()) as { idToken: string };
  const idToken = reqBody.idToken;

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  const auth = getAuth(adminApp);

  try {
    const decodedIdToken = await auth.verifyIdToken(idToken);
    
    if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
      return NextResponse.json({ error: 'Recent sign-in required' }, { status: 401 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const options = {
      name: '__session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    };

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set(options);
    
    return response;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const options = {
    name: '__session',
    value: '',
    maxAge: -1,
  };

  const response = NextResponse.json({ status: 'success' }, { status: 200 });
  response.cookies.set(options);

  return response;
}
