
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

import { adminDb, logOrphanedUser, findUserById } from '@/lib/data.server';
import { createSessionCookie, clearSessionCookie, adminAuth } from '@/lib/session.server';
import type { User } from '@/lib/types';
import { FirebaseError } from 'firebase/app';
import { checkAndConsumeInvites } from './invites';

const SignUpSchema = z.object({
  idToken: z.string(),
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
});

const LoginSchema = z.object({
  idToken: z.string(),
});


// --- SERVER ACTIONS ---

export async function login(values: z.infer<typeof LoginSchema>): Promise<{ success: boolean; error?: string }> {
  const validatedFields = LoginSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: "Invalid ID token provided." };
  }

  const { idToken } = validatedFields.data;

  try {
    const uid = await createSessionCookie(idToken);
    const user = await findUserById(uid);
    if (user) {
        await checkAndConsumeInvites(user);
        // Update updatedAt on every login for inactivity tracking
        await adminDb.collection('users').doc(uid).update({
            updatedAt: FieldValue.serverTimestamp()
        });
        revalidatePath('/home');
        return { success: true };
    } else {
        // Handle case where user has Auth account but no Firestore doc
        const email = (await adminAuth.getUser(uid)).email;
        return { success: false, requiresSignup: true, email };
    }
  } catch (error) { // Type error as FirebaseError or generic Error
    if (error instanceof FirebaseError || error instanceof Error) {
        console.error("[AUTH_ACTION_TRACE] Login Server Action Error:", error.message);
        return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred while creating the session." };
  }
}

export async function signup(values: z.infer<typeof SignUpSchema>): Promise<{ success: boolean; error?: string; userId?: string }> {
  const validatedFields = SignUpSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error('[AUTH_ACTION_TRACE] Signup validation failed.', validatedFields.error);
    return { success: false, error: 'Invalid data provided.' };
  }

  const { idToken, name, email } = validatedFields.data;

  try {
    const uid = await createSessionCookie(idToken);

    await adminDb.runTransaction(async (transaction) => {
        const usersCollection = adminDb.collection('users');
        
        const orphanQuery = usersCollection.where('email', '==', email).limit(1);
        const orphanSnapshot = await transaction.get(orphanQuery);

        if (!orphanSnapshot.empty) {
            const orphanDoc = orphanSnapshot.docs[0];
            if (orphanDoc.id !== uid) {
                const orphanData = { id: orphanDoc.id, ...orphanDoc.data() } as User;
                await logOrphanedUser(orphanData);
                transaction.delete(orphanDoc.ref);
            }
        }

        const newUserRef = usersCollection.doc(uid);
        const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
            name,
            email,
            role: '',
            username: name,
            avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
            bio: 'Just joined Open for Product!',
            onboardingCompleted: false,
        };
        transaction.set(newUserRef, newUser);
    });

    const user = await findUserById(uid);
    if (user) {
        await checkAndConsumeInvites(user);
    }

    revalidatePath('/onboarding');
    return { success: true, userId: uid };

  } catch (error) { // Type error as FirebaseError or generic Error
    console.error('[AUTH_ACTION_TRACE] Signup Server Action Error:', error);
    await clearSessionCookie();
    if (error instanceof FirebaseError || error instanceof Error) {
        return { success: false, error: error.message };
    }
    return {
      success: false,
      error: 'An unknown error occurred during signup.',
    };
  }
}

export async function logout() {
    try {
        await clearSessionCookie();
        revalidatePath('/', 'layout');
    } catch (error) {
        console.error("[AUTH_ACTION_TRACE] Logout Server Action Error:", error);
    }
}
