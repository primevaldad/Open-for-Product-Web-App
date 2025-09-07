
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

import { findUserById, addUser } from '@/lib/data-cache';
import type { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const SignUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
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

  const { email, password, name } = validatedFields.data;
  const adminAuth = getAuth(adminApp);
  
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    
    const newUser: Omit<User, 'id'> = {
        name,
        email,
        avatarUrl: `https://i.pravatar.cc/150?u=${userRecord.uid}`,
        bio: 'Just joined Open for Product!',
        interests: [],
        onboarded: false, // Start with onboarding incomplete
    };

    await addUser(userRecord.uid, newUser);
    
    // We no longer create a session cookie here.
    // The user will be redirected to the login page to sign in.
    revalidatePath('/login');
    return { success: true, userId: userRecord.uid };

  } catch (error: any) {
    console.error('Signup Error:', error); // Add detailed logging
    let errorMessage = 'An unknown error occurred.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already in use by another account.';
    }
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
    
    // We don't actually use Firebase Client SDK to login,
    // as we can't create a session cookie from the client.
    // So this action is a placeholder for the logic handled by middleware.
    // The actual sign-in and session cookie creation happens in a custom API route
    // that the login form will post to. 
    // For now, this structure is fine. The user will be redirected by the form.

    // A real implementation would verify the password here. For this prototype,
    // we assume the password is correct and rely on the session creation step.
    return { success: true };
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
  const adminAuth = getAuth(adminApp);
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    cookies().set(SESSION_COOKIE_NAME, '', { expires: new Date(0) });
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie).catch(() => null);
    if (decodedClaims) {
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    }
  }
  revalidatePath('/', 'layout');
}
