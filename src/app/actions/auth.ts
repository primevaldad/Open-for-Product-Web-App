
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { users } from '@/lib/data';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const SwitchUserSchema = z.object({
  userId: z.string(),
});

async function updateCurrentUser(userId: string) {
    try {
        const fileContent = await fs.readFile(dataFilePath, 'utf-8');
        
        const newCurrentUser = users.find(u => u.id === userId);
        if (!newCurrentUser) {
            throw new Error("User not found");
        }

        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error("User not found in data array");
        }

        // Use a more robust regex to find and replace the currentUser export
        const updatedContent = fileContent.replace(
            /export let currentUser: User = users\[\d+\];/,
            `export let currentUser: User = users[${userIndex}];`
        );
        
        await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

    } catch (error) {
        console.error("Error updating current user:", error);
        throw new Error("Could not switch user.");
    }
}


export async function switchUser(values: z.infer<typeof SwitchUserSchema>) {
    const validatedFields = SwitchUserSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid user ID provided.',
        };
    }

    const { userId } = validatedFields.data;

    try {
        await updateCurrentUser(userId);
        revalidatePath('/', 'layout'); // Revalidate all pages
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }

    return { success: true };
}
