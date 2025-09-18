
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { adminDb, findUserByEmail, logOrphanedUser } from '@/lib/data.server';
import { createSession, clearSession } from '@/lib/session.server';
import type { User } from '@/lib/types';

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
    await createSession(idToken);
    revalidatePath('/home');
    return { success: true };
  } catch (error: any) {
    console.error("[AUTH_ACTION_TRACE] Login Server Action Error:", error.message);
    return { success: false, error: error.message || "Failed to create session." };
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
    // Create the session and get the new UID from the valid token.
    const uid = await createSession(idToken);

    // ** ATOMIC TRANSACTION **
    // This ensures that finding, logging, deleting, and creating the user profile happen as a single, indivisible operation.
    await adminDb.runTransaction(async (transaction) => {
        const usersCollection = adminDb.collection('users');
        
        // 1. Find potential orphan using the transaction
        const orphanQuery = usersCollection.where('email', '==', email).limit(1);
        const orphanSnapshot = await transaction.get(orphanQuery);

        if (!orphanSnapshot.empty) {
            const orphanDoc = orphanSnapshot.docs[0];
            // Ensure we don't accidentally delete the profile for the UID we just created
            if (orphanDoc.id !== uid) {
                const orphanData = { id: orphanDoc.id, ...orphanDoc.data() } as User;

                // 2. Log the orphan for auditing (not part of the transaction itself, but good practice)
                await logOrphanedUser(orphanData);

                // 3. Delete the orphan within the transaction
                transaction.delete(orphanDoc.ref);
            }
        }

        // 4. Create the new user profile within the transaction
        const newUserRef = usersCollection.doc(uid);
        const newUser: Omit<User, 'id'> = {
            name,
            email,
            avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
            bio: 'Just joined Open for Product!',
            interests: [],
            onboarded: false,
        };
        transaction.set(newUserRef, newUser);
    });

    revalidatePath('/onboarding');
    return { success: true, userId: uid };

  } catch (error: any) {
    console.error('[AUTH_ACTION_TRACE] Signup Server Action Error:', error);
    await clearSession();
    return {
      success: false,
      error: error.message || 'An unknown error occurred during signup.',
    };
  }
}

export async function logout() {
  await clearSession();
  revalidatePath('/', 'layout');
}
