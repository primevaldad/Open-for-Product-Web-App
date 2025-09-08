
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './firebase-admin';
import { findUserById } from './data-cache';
import type { User } from './types';

const SESSION_COOKIE_NAME = '__session';

/**
 * Gets the current user from the session cookie.
 * This is a server-only function.
 * @returns The current user, or null if not logged in.
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
        if (!sessionCookie) {
            return null;
        }

        const adminAuth = getAuth(adminApp);
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const currentUser = await findUserById(decodedClaims.uid);
        
        return currentUser ? { ...currentUser, id: decodedClaims.uid } : null;

    } catch (error) {
        // Session cookie is invalid or expired.
        // It's safe to ignore this error and return null.
        return null;
    }
}
