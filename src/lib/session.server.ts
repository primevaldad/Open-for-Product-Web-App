'use server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './firebase.server';
import { findUserById } from './data.server';
import { UserNotFoundError } from './errors';
import type { User } from './types';

const SESSION_COOKIE_NAME = '__session';
const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

// --- PUBLIC API ---

/**
 * Creates a session cookie for the given ID token and sets it in the cookies.
 * This is a server-only function.
 * @param idToken The Firebase ID token of the user.
 * @returns The UID of the authenticated user.
 */
export async function createSession(idToken: string): Promise<string> {
  console.log('[AUTH_TRACE] Creating session...');
  const adminAuth = getAuth(adminApp);
  const decodedIdToken = await adminAuth.verifyIdToken(idToken);

  // Security check: ensure the token was issued recently.
  if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
    throw new Error('Recent sign-in required! Please try logging in again.');
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  // Conditionally set sameSite attribute for Firebase preview iFrame
  const sameSite = process.env.FIREBASE_PREVIEW_URL ? 'none' : 'lax';

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: true,
    sameSite,
    maxAge: SESSION_DURATION_MS,
    path: '/',
  });
  console.log('[AUTH_TRACE] Session cookie set successfully.');
  return decodedIdToken.uid;
}

/**
 * Clears the session cookie and revokes the user's refresh tokens.
 * This is a server-only function.
 */
export async function clearSession(): Promise<void> {
  console.log('[AUTH_TRACE] Clearing session...');
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // Clear the cookie from the browser
  cookieStore.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });

  if (sessionCookieValue) {
    const adminAuth = getAuth(adminApp);
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(
        sessionCookieValue,
        true
      );
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
      console.log(`[AUTH_TRACE] Revoked tokens for UID: ${decodedClaims.sub}`);
    } catch (error) {
      console.log(
        '[AUTH_TRACE] Could not revoke tokens; session cookie may have been invalid.'
      );
    }
  }
}

/**
 * Gets the current user from the session cookie.
 * This is a server-only function.
 * @returns The current user, or null if not logged in.
 * @throws {UserNotFoundError} If the user is authenticated but not in the database.
 */
export async function getCurrentUser(): Promise<User | null> {
  console.log('[AUTH_TRACE] Attempting to get current user...');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    console.log('[AUTH_TRACE] Session cookie not found.');
    return null;
  }

  console.log('[AUTH_TRACE] Session cookie found. Verifying...');
  try {
    const adminAuth = getAuth(adminApp);
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie.value,
      true
    );
    console.log(`[AUTH_TRACE] Session cookie verified for UID: ${decodedClaims.uid}`);

    const currentUser = await findUserById(decodedClaims.uid);

    if (!currentUser) {
      console.error(
        `[AUTH_TRACE] Auth successful, but no user found in DB for UID: ${decodedClaims.uid}`
      );
      throw new UserNotFoundError(`User with UID ${decodedClaims.uid} not found.`);
    }

    console.log(`[AUTH_TRACE] Successfully found user in DB: ${currentUser.name}`);
    return { ...currentUser, id: decodedClaims.uid };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      throw error;
    }
    console.error('[AUTH_TRACE] Session verification failed:', error);
    return null;
  }
}

/**
 * Gets the current user or throws an error if not logged in.
 * This is a server-only function.
 * @returns The current user.
 * @throws {UserNotFoundError} If the user is authenticated but not in the database.
 * @throws {Error} If the user is not authenticated.
 */
export async function getAuthenticatedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
