
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';

const SwitchUserSchema = z.object({
  userId: z.string(),
});

export async function switchUser(values: z.infer<typeof SwitchUserSchema>) {
    const validatedFields = SwitchUserSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid user ID provided.',
        };
    }

    const { userId } = validatedFields.data;
    
    // NOTE: The concept of a "current user" needs to be handled
    // by a proper authentication system (e.g., storing session in a cookie).
    // The previous implementation of updating a server-side cache was flawed.
    // For now, we simulate the "switch" by just redirecting, but the actual
    // user state won't change until a real auth system is built.
    
    try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return {
                success: false,
                error: "User not found",
            };
        }
        
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    redirect('/');
}
