
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase.server';

const SESSION_COOKIE_NAME = '__session';

/**
 * Handles the logout process by clearing the session cookie and revoking Firebase refresh tokens.
 * This is triggered by a redirect from server components when an invalid session state is detected.
 */
export async function GET(request: NextRequest) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // Create a response that will redirect the user to the login page.
    const redirectURL = request.nextUrl.clone();
    redirectURL.pathname = '/login';
    const response = NextResponse.redirect(redirectURL);

    // Clear the session cookie from the browser by setting its maxAge to 0.
    response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        maxAge: 0,
        path: '/',
    });

    // If a session cookie exists, attempt to revoke the refresh tokens with Firebase.
    if (sessionCookie) {
        try {
            const adminAuth = getAuth(adminApp);
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
            await adminAuth.revokeRefreshTokens(decodedClaims.sub);
            console.log(`[LOGOUT_ROUTE] Revoked Firebase tokens for UID: ${decodedClaims.sub}`);
        } catch (error) {
            // This can happen if the cookie is expired or malformed.
            // We can ignore it because we are clearing the cookie anyway.
            console.log(`[LOGOUT_ROUTE] Failed to revoke tokens on logout: ${error}`);
        }
    }

    return response;
}
