
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';

// This is a simplified example. In a real app, you'd use a database.
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const UserSettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Name is required." }),
  bio: z.string().optional(),
  avatarDataUrl: z.string().optional().nullable(),
});

const OnboardingSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'Name is required.' }),
  bio: z.string().optional(),
  interests: z.array(z.string()).min(1, { message: 'Please select at least one interest.' }),
});


function serializeUsers(users: User[]): string {
    const userStrings = users.map(u => {
        const interestsString = u.interests ? `interests: [${u.interests.map(i => `'${i}'`).join(', ')}]` : '';
        const onboardedString = `onboarded: ${u.onboarded}`;
        
        const fields = [
            `id: '${u.id}'`,
            `name: '${u.name.replace(/'/g, "\\'")}'`,
            `avatarUrl: '${u.avatarUrl}'`,
            `bio: '${u.bio?.replace(/'/g, "\\'") ?? ''}'`,
            interestsString,
            onboardedString
        ].filter(Boolean).join(',\n    ');

        return `  { 
    ${fields} 
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
    
    // Read the original file content to find where the users array is
    const originalContent = await fs.readFile(dataFilePath, 'utf-8');
    
    // This regex is a bit more robust to find the users array declaration
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


export async function updateOnboardingInfo(values: z.infer<typeof OnboardingSchema>) {
  const validatedFields = OnboardingSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { id, name, bio, interests } = validatedFields.data;

  try {
    await updateDataFile(({ users }) => {
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const updatedUser: User = {
        ...users[userIndex],
        name,
        bio,
        interests,
        onboarded: true,
      };

      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      
      return { users: updatedUsers };
    });

    revalidatePath('/profile');
    revalidatePath('/onboarding');

  } catch (error) {
    return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
  }
  
  redirect('/profile');

  return { success: true };
}
