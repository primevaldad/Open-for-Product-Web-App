
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getHydratedData } from '@/lib/data-cache';

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
    
    let userIndex = -1;
    try {
        const { users } = await getHydratedData();
        userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return {
                success: false,
                error: "User not found",
            };
        }
        
        // The flawed updateCurrentUser call is removed.
        // await updateCurrentUser(userIndex);

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    redirect('/');
}
