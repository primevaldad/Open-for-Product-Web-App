
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// This is a simplified example. In a real app, you'd fetch this from a database.
const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const UserSettingsSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  bio: z.string().optional(),
  avatarDataUrl: z.string().optional().nullable(),
});

// A helper function to read and modify the data.ts file.
// This is NOT a production-ready approach, but works for prototyping.
async function updateDataFile(updater: (content: string) => string): Promise<void> {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const updatedContent = updater(fileContent);
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');
  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update user data.");
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

  const { name, bio, avatarDataUrl } = validatedFields.data;

  try {
    await updateDataFile(content => {
      let newContent = content;
      
      // Update name
      newContent = newContent.replace(
        /(export const currentUser: User = users\[0\];)/,
        `currentUser.name = \`${name}\`;\n$1`
      );

      // Update bio
      if (bio !== undefined) {
         newContent = newContent.replace(
          /(export const currentUser: User = users\[0\];)/,
          `currentUser.bio = \`${bio}\`;\n$1`
        );
      }

      // Update avatar
      if (avatarDataUrl) {
         newContent = newContent.replace(
          /(export const currentUser: User = users\[0\];)/,
          `currentUser.avatarUrl = \`${avatarDataUrl}\`;\n$1`
        );
      }
      
      // This is a bit of a hack to prepend the updates to the file.
      // A real implementation would parse the AST or use a database.
      const finalContent = content.replace(
          /id: 'u1', name: 'Alex Doe'/g,
          `id: 'u1', name: '${name}'`
      ).replace(
          /bio: 'Full-stack developer with a passion for open source and community projects.'/g,
          `bio: '${bio}'`
      );
      
      if (avatarDataUrl) {
        return finalContent.replace(
            /avatarUrl: 'https:\/\/placehold.co\/40x40.png'/g,
            `avatarUrl: '${avatarDataUrl}'`
        );
      }

      return finalContent;
    });

    // Revalidate paths to reflect changes immediately across the app
    revalidatePath('/settings');
    revalidatePath('/profile');
    revalidatePath('/');
    
    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
  }
}
