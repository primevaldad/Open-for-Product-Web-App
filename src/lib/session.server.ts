import 'server-only';
import { cookies } from 'next/headers';
import * as admin from 'firebase-admin';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import type { User } from '@/lib/types';
import { findUserById } from '@/lib/data.server';

const IS_PROD = process.env.NODE_ENV === 'production';
const SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);

// Ensure the Firebase app is initialized only once.
if (!getApps().length) {
  initializeApp({
    credential: cert(SERVICE_ACCOUNT),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
} else {
  getApp();
}

export const adminAuth = getAuth();

const SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
const SESSION_DURATION_SECS = SESSION_DURATION_MS / 1000;

export async function createSessionCookie(idToken: string): Promise<string> {
    try {
        const decodedIdToken = await adminAuth.verifyIdToken(idToken, true);
        const uid = decodedIdToken.uid;

        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn: SESSION_DURATION_MS,
        });

        const cookieStore = cookies();

        (await cookieStore).set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: SESSION_DURATION_SECS, // seconds, not ms
            httpOnly: true,
            secure: IS_PROD,
            path: '/',
            sameSite: process.env.FIREBASE_PREVIEW_URL ? 'none' : 'lax',
        });

        return uid;
    } catch (error) {
        console.error('Failed to create session:', error);
        throw new Error(`Failed to create session: ${error}`);
    }
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = cookies();
    (await cookieStore).set(SESSION_COOKIE_NAME, '', {
        maxAge: 0,
        httpOnly: true,
        secure: IS_PROD,
        path: '/',
    });
}

export async function getAuthenticatedUser(): Promise<User | null> {
    const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

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
    } catch (error: any) {
        // When a session cookie is invalid or expired, verifySessionCookie throws.
        // We log this for debugging, but it's not a critical server error.
        // We return null to indicate no authenticated user.
        if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            // This is likely a Firebase Auth error, log it with details.
            console.error(
                `Error verifying session cookie. Code: ${error.code}, Message: ${error.message}`
            );
        } else {
            // The error is not in the expected format, log it as-is to prevent crashing.
            console.error('An unexpected error occurred during session verification:', error);
        }
        
        // In any error case, the user is not authenticated.
        return null;
    }
}
