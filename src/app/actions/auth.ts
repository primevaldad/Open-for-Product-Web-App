'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { mockUsers } from '@/lib/mock-data';

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
    
    // This is a mock action. In a real app, you'd update the user's session.
    const userExists = mockUsers.some(u => u.id === userId);

    if (!userExists) {
        return {
            success: false,
            error: "User not found",
        };
    }

    // For the prototype, we'll just redirect. The "current user" is hardcoded in data-cache.
    // To see the effect, you would need to change the hardcoded ID in `getCurrentUser`
    // and then this action would simulate logging in as them.
    // We will simulate a "successful" switch for now.
    console.log(`Simulating switch to user: ${userId}`);
    
    redirect('/');
}
