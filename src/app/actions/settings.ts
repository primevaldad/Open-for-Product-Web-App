
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { User } from '@/lib/types';
import { currentUser } from '@/lib/data';

// This is a simplified example. In a real app, you'd use a database.
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const UserSettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Name is required." }),
  bio: z.string().optional(),
  avatarDataUrl: z.string().optional().nullable(),
});


function serializeUsers(users: User[]): string {
    const userStrings = users.map(u => {
        return `  { 
    id: '${u.id}', 
    name: '${u.name.replace(/'/g, "\\'")}', 
    avatarUrl: '${u.avatarUrl}', 
    bio: '${u.bio?.replace(/'/g, "\\'") ?? ''}' 
  }`;
    }).join(',\n');
    return `export const users: User[] = [\n${userStrings}\n];`;
}


// This is a simplified example. In a real app, you'd use a database.
async function updateDataFile(updater: (data: { users: User[] }) => { users: User[] }) {
  try {
    const dataFileModule = await import(`@/lib/data.ts?timestamp=${new Date().getTime()}`);
    const currentUsers: User[] = dataFileModule.users;

    const { users: updatedUsers } = updater({ users: currentUsers });
    
    const originalContent = await fs.readFile(dataFilePath, 'utf-8');
    
    const usersRegex = /export const users: User\[\] = \[[\s\S]*?\];/;
    const updatedContent = originalContent.replace(usersRegex, serializeUsers(updatedUsers));
    
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update data file.");
  }
}

export async function updateUserSettings(values: z.infer<typeof UserSettingsSchema>) {
  const validatedFields = UserSettingsSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Invalid data provided.",
    };
  }

  const { id, name, bio, avatarDataUrl } = validatedFields.data;

  try {
     await updateDataFile(({ users }) => {
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            throw new Error("User not found");
        }

        const updatedUser: User = {
            ...users[userIndex],
            name,
            bio,
            avatarUrl: avatarDataUrl || users[userIndex].avatarUrl,
        };

        const updatedUsers = [...users];
        updatedUsers[userIndex] = updatedUser;
        return { users: updatedUsers };
     });

    // Revalidate paths to reflect changes immediately across the app
    revalidatePath('/settings');
    revalidatePath('/profile');
    revalidatePath('/', 'layout');
    
    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
  }
}
