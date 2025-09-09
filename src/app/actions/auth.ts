
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase.server';
import { revalidatePath } from 'next/cache';

import { findUserById, addUser } from '@/lib/data.server';
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
  console.log('[AUTH_ACTION_TRACE] Creating session...');
  const adminAuth = getAuth(adminApp);
  const decodedIdToken = await adminAuth.verifyIdToken(idToken);

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
    throw new Error('Recent sign-in required! Please try logging in again.');
  }

  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: expiresIn,
    path: '/',
  });
  console.log('[AUTH_ACTION_TRACE] Session cookie set successfully.');
}

// --- SERVER ACTIONS ---

export async function login(values: z.infer<typeof LoginSchema>): Promise<{ success: boolean; error?: string }> {
  console.log('[AUTH_ACTION_TRACE] Login action initiated.');
  const validatedFields = LoginSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: "Invalid ID token provided." };
  }

  const { idToken } = validatedFields.data;

  try {
    await createSession(idToken);
    revalidatePath('/home');
    console.log('[AUTH_ACTION_TRACE] Login successful.');
    return { success: true };
  } catch (error: any) {
    console.error("[AUTH_ACTION_TRACE] Login Server Action Error:", error.message);
    return { success: false, error: error.message || "Failed to create session." };
  }
}

export async function signup(values: z.infer<typeof SignUpSchema>): Promise<{ success: boolean; error?: string; userId?: string }> {
  console.log('[AUTH_ACTION_TRACE] Signup action initiated.');
  const validatedFields = SignUpSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error('[AUTH_ACTION_TRACE] Signup validation failed.', validatedFields.error);
    return { success: false, error: 'Invalid data provided.' };
  }

  const { idToken, name, email } = validatedFields.data;
  const adminAuth = getAuth(adminApp);

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log(`[AUTH_ACTION_TRACE] Token verified for UID: ${uid}`);

    const existingUser = await findUserById(uid);
    if (existingUser) {
      console.log(`[AUTH_ACTION_TRACE] User with UID ${uid} already exists. Proceeding with login.`);
    } else {
      console.log(`[AUTH_ACTION_TRACE] User not found. Creating new user record for UID: ${uid}`);
      const newUser: Omit<User, 'id'> = {
        name,
        email,
        avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
        bio: 'Just joined Open for Product!',
        interests: [],
        onboarded: false,
      };
      await addUser(uid, newUser);
      console.log(`[AUTH_ACTION_TRACE] New user record created successfully for UID: ${uid}`);
    }

    await createSession(idToken);

    revalidatePath('/onboarding');
    console.log(`[AUTH_ACTION_TRACE] Signup successful for UID: ${uid}`);
    return { success: true, userId: uid };

  } catch (error: any) {
    console.error('[AUTH_ACTION_TRACE] Signup Server Action Error:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during signup.',
    };
  }
}

export async function logout() {
  console.log('[AUTH_ACTION_TRACE] Logout action initiated.');
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    cookieStore.set(SESSION_COOKIE_NAME, '', { maxAge: 0 });
    console.log('[AUTH_ACTION_TRACE] Session cookie cleared.');

    const adminAuth = getAuth(adminApp);
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
      console.log(`[AUTH_ACTION_TRACE] Firebase refresh tokens revoked for UID: ${decodedClaims.sub}`);
    } catch (error) {
      console.log('[AUTH_ACTION_TRACE] Logout: Could not revoke tokens, session cookie likely invalid.');
    }
  }
  revalidatePath('/', 'layout');
  console.log('[AUTH_ACTION_TRACE] Logout complete, path revalidated.');
}
