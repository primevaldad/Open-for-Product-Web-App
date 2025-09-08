
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

import { findUserById, addUser } from '@/lib/data-cache';
import type { User } from '@/lib/types';

const SignUpSchema = z.object({
  idToken: z.string(),
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
});

const LoginSchema = z.object({
  idToken: z.string(),
});

const SESSION_COOKIE_NAME = '__session';

// --- SESSION MANAGEMENT ---

async function createSession(idToken: string): Promise<void> {
  const adminAuth = getAuth(adminApp);
  const decodedIdToken = await adminAuth.verifyIdToken(idToken);

  // Session expires in 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  // Ensure the user has signed in recently.
  if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
    throw new Error('Recent sign-in required! Please try logging in again.');
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: expiresIn,
    path: '/',
  });
}

// --- SERVER ACTIONS ---

/**
 * Handles user login.
 * Verifies the Firebase ID token and creates a session cookie.
 * Returns a JSON object indicating success or failure. Does NOT redirect.
 */
export async function login(values: z.infer<typeof LoginSchema>): Promise<{ success: boolean; error?: string }> {
  const validatedFields = LoginSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: "Invalid ID token provided." };
  }

  const { idToken } = validatedFields.data;

  try {
    await createSession(idToken);
    // Revalidate the home path to ensure the layout re-fetches the user.
    revalidatePath('/home');
    return { success: true };
  } catch (error: any) {
    console.error("Login Server Action Error:", error.message);
    return { success: false, error: error.message || "Failed to create session. Please try again." };
  }
}

/**
 * Handles user signup.
 * Creates a new user in the database and creates a session cookie.
 * Returns a JSON object indicating success or failure. Does NOT redirect.
 */
export async function signup(values: z.infer<typeof SignUpSchema>): Promise<{ success: boolean; error?: string; userId?: string }> {
  const validatedFields = SignUpSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { idToken, name, email } = validatedFields.data;
  const adminAuth = getAuth(adminApp);

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check if user already exists before trying to add them
    const existingUser = await findUserById(uid);
    if (existingUser) {
      // This case can happen if a user signs up, deletes their account from your DB,
      // but the Firebase user still exists.
      console.log(`User with UID ${uid} already exists. Proceeding with login.`);
    } else {
      const newUser: Omit<User, 'id'> = {
        name,
        email,
        avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
        bio: 'Just joined Open for Product!',
        interests: [],
        onboarded: false,
      };
      await addUser(uid, newUser);
    }

    await createSession(idToken);

    // Revalidate the onboarding path in case the user needs to go there.
    revalidatePath('/onboarding');
    return { success: true, userId: uid };

  } catch (error: any) {
    console.error('Signup Server Action Error:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during signup.',
    };
  }
}

/**
 * Handles user logout.
 * Clears the session cookie and revokes Firebase refresh tokens.
 */
export async function logout() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    // Clear the cookie from the browser
    cookies().set(SESSION_COOKIE_NAME, '', { maxAge: 0 });

    const adminAuth = getAuth(adminApp);
    try {
      // Verify the cookie to get the user's UID
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      // Revoke all refresh tokens for that user
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    } catch (error) {
      // This can happen if the cookie is already invalid. We can ignore it.
      console.log('Logout: Could not revoke tokens, session cookie likely invalid.');
    }
  }
  // Revalidate the entire application's cache to reflect the logged-out state.
  revalidatePath('/', 'layout');
}
