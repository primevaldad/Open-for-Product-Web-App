
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getHydratedData, updateCurrentUser } from '@/lib/data-cache';

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

        await updateCurrentUser(userIndex);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    redirect('/');
}
