'use server';
import { cookies } from 'next/headers';
import { adminAuth } from './firebase.server';
import { findUserById, createGuestUser } from './data.server';
import { UserNotFoundError, NotAuthenticatedError } from './errors';
import type { User } from './types';

const SESSION_COOKIE_NAME = '__session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

const IS_PROD = process.env.NODE_ENV === 'production';

// --- PUBLIC API ---

/**
 * Creates a session cookie for the given ID token. If the user does not exist
 * in the database, a new guest user is created.
 * @param idToken The Firebase ID token of the user.
 * @returns The UID of the authenticated user.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Ensure user exists in our database
    try {
      await findUserById(uid);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        console.log(`First login for user ${uid}, creating guest user.`);
        await createGuestUser({uid, email: decodedToken.email, displayName: decodedToken.name});
      } else {
        throw error; // Re-throw other errors
      }
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    await cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_DURATION_MS,
      httpOnly: true,
      secure: IS_PROD,
      path: '/',
      sameSite: 'lax',
    });

    return uid;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error(`Failed to create session: ${error}`);
  }
}

/**
 * Clears the session cookie, effectively logging the user out.
 */
export async function clearSessionCookie(): Promise<void> {
  await cookies().set(SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    secure: IS_PROD,
    path: '/',
  });
}

/**
 * Retrieves the currently authenticated user from the session cookie.
 * @returns The authenticated user object, or null if no valid session exists.
 * @throws {NotAuthenticatedError} If the session is invalid or the user is not found.
 */
export async function getAuthenticatedUser(): Promise<User> {
  const sessionCookie = (await cookies().get(SESSION_COOKIE_NAME))?.value;

  if (!sessionCookie) {
    throw new NotAuthenticatedError();
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await findUserById(decodedToken.uid);
    return user;
  } catch (error) {
    // Clear the invalid cookie
    await clearSessionCookie();

    if (error instanceof UserNotFoundError) {
      console.warn('User from session not found in DB', (error as Error).message);
      throw new NotAuthenticatedError('User not found');
    }

    console.error('Error verifying session cookie:', error);
    throw new NotAuthenticatedError();
  }
}
