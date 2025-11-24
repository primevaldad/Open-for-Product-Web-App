// session.server.ts
'use server';
import { cookies } from 'next/headers';
import { adminAuth } from './firebase.server';
import { findUserById, createGuestUser } from './data.server';
import { UserNotFoundError, NotAuthenticatedError } from './errors';
import type { User } from './types';

const SESSION_COOKIE_NAME = '__session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days
const SESSION_DURATION_SECS = Math.floor(SESSION_DURATION_MS / 1000);

const IS_PROD = process.env.NODE_ENV === 'production';

// --- PUBLIC API ---

export async function createSessionCookie(idToken: string): Promise<string> {
  // force dynamic evaluation (keeps Next happy in server actions)
  await Promise.resolve();
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const user = await findUserById(uid);
    if (!user) {
      console.log(`First login for user ${uid}, creating user profile.`);
      await createGuestUser(uid);
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    // await the cookie store
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_SECS, // seconds, not ms
      httpOnly: true,
      secure: IS_PROD,
      path: '/',
      // sameSite 'none' must be secure: true in browsers
      sameSite: process.env.FIREBASE_PREVIEW_URL ? 'none' : 'lax',
    });

    return uid;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error(`Failed to create session: ${error}`);
  }
}

export async function clearSessionCookie(): Promise<void> {
  await Promise.resolve();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    secure: IS_PROD,
    path: '/',
  });
}

export async function getAuthenticatedUser(): Promise<User | null> {
  await Promise.resolve();
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await findUserById(decodedToken.uid);
    if (!user) {
      console.warn(`User with ID ${decodedToken.uid} not found in database.`);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error verifying session cookie. Raw error:', error);
    try {
      console.error('Error verifying session cookie. JSON serialized:', JSON.stringify(error));
    } catch (e) {
      console.error('Could not serialize error to JSON.');
    }
    return null;
  }
}
