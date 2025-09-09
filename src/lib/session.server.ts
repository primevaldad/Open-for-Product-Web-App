
import 'server-only';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './firebase.server';
import { findUserById } from './data.server';
import { UserNotFoundError } from './errors'; // Import the custom error
import type { User } from './types';

const SESSION_COOKIE_NAME = '__session';

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
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value, false);
        console.log(`[AUTH_TRACE] Session cookie verified for UID: ${decodedClaims.uid}`);

        const currentUser = await findUserById(decodedClaims.uid);
        
        if (!currentUser) {
            // This is the critical change: throw the specific error.
            console.error(`[AUTH_TRACE] Auth successful, but no user found in DB for UID: ${decodedClaims.uid}`);
            throw new UserNotFoundError(`User with UID ${decodedClaims.uid} not found.`);
        }

        console.log(`[AUTH_TRACE] Successfully found user in DB: ${currentUser.name}`);
        return { ...currentUser, id: decodedClaims.uid };

    } catch (error) {
        // If it's our custom error, re-throw it so it can be handled by the caller.
        if (error instanceof UserNotFoundError) {
            throw error;
        }

        // Otherwise, it's an issue with session verification (e.g., expired cookie).
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
        // This will now only be thrown for truly unauthenticated users (no/invalid cookie).
        throw new Error('User not authenticated');
    }
    return user;
}
