
'use server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './firebase.server';
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
export async function createSession(idToken: string): Promise<string> {
  console.log('[AUTH_TRACE] Creating session...');
  const adminAuth = getAuth(adminApp);
  const decodedIdToken = await adminAuth.verifyIdToken(idToken);

  // Check if user exists
  let user = await findUserById(decodedIdToken.uid);
  if (!user) {
    console.log(`[AUTH_TRACE] User not found for UID ${decodedIdToken.uid}. Creating guest user.`);
    user = await createGuestUser(decodedIdToken.uid);
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: true, 
    sameSite: IS_PROD ? 'lax' : 'none',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  });
  console.log('[AUTH_TRACE] Session cookie set successfully.');
  return decodedIdToken.uid;
}

/**
 * Clears the session cookie and revokes the user's refresh tokens.
 */
export async function clearSession(): Promise<void> {
  console.log('[AUTH_TRACE] Clearing session...');
  const cookieStore = await cookies();
  const sessionCookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  cookieStore.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });

  if (sessionCookieValue) {
    const adminAuth = getAuth(adminApp);
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookieValue, IS_PROD);
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
      console.log(`[AUTH_TRACE] Revoked tokens for UID: ${decodedClaims.sub}`);
    } catch {
      console.log('[AUTH_TRACE] Could not revoke tokens; session cookie may have been invalid.');
    }
  }
}

/**
 * Gets the current user from the session cookie. If the user is authenticated but
 * not in the database, a new guest user is created.
 * @returns The current user, or null if not logged in.
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
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value, IS_PROD);
    console.log(`[AUTH_TRACE] Session cookie verified for UID: ${decodedClaims.uid}`);

    let currentUser = await findUserById(decodedClaims.uid);

    if (!currentUser) {
      console.warn(`[AUTH_TRACE] User authenticated but not in DB. Creating guest user for UID: ${decodedClaims.uid}`);
      currentUser = await createGuestUser(decodedClaims.uid);
    }

    console.log(`[AUTH_TRACE] Successfully found user in DB: ${currentUser.name}`);
    return { ...currentUser, id: decodedClaims.uid };
  } catch (error) {
    console.error('[AUTH_TRACE] Session verification failed:', error);
    return null;
  }
}

/**
 * Gets the current user or throws an error if not logged in.
 * @returns The current user.
 * @throws {NotAuthenticatedError} If the user is not authenticated.
 */
export async function getAuthenticatedUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new NotAuthenticatedError();
  }
  return user;
}
