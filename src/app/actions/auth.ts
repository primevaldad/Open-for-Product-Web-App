
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

import { findUserById, addUser } from '@/lib/data-cache';
import type { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const SignUpSchema = z.object({
  idToken: z.string(),
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
});

const LoginSchema = z.object({
  idToken: z.string(),
});

const SESSION_COOKIE_NAME = '__session';
const SESSION_COOKIE_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function signup(values: z.infer<typeof SignUpSchema>) {
  const validatedFields = SignUpSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid data provided.',
    };
  }
  
  const { idToken, name, email } = validatedFields.data;
  const adminAuth = getAuth(adminApp);
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const newUser: Omit<User, 'id'> = {
        name,
        email,
        avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
        bio: 'Just joined Open for Product!',
        interests: [],
        onboarded: false,
    };

    await addUser(uid, newUser);
    await createSession(idToken);
    
    revalidatePath('/onboarding');
    return { success: true, userId: uid };

  } catch (error: any) {
    console.error('Signup Server Action Error:', error);
    let errorMessage = 'An unknown error occurred during server-side processing.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function login(values: z.infer<typeof LoginSchema>) {
    const validatedFields = LoginSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, error: "Invalid data provided." };
    }

    const { idToken } = validatedFields.data;

    try {
        await createSession(idToken);
        return { success: true };
    } catch (error) {
        console.error("Login Server Action Error:", error);
        return { success: false, error: "Failed to create session." };
    }
}

export async function createSession(idToken: string) {
    const adminAuth = getAuth(adminApp);
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);

    if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
        throw new Error('Recent sign-in required!');
    }
    
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_COOKIE_EXPIRES_IN });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_COOKIE_EXPIRES_IN,
        path: '/',
    });
}


export async function logout() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    cookies().set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
    const adminAuth = getAuth(adminApp);
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
        await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    } catch (error) {
        // Session cookie is invalid. No need to revoke tokens.
    }
  }
  revalidatePath('/', 'layout');
}
