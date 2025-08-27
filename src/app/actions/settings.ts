
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';
import { getData, setData } from '@/lib/data-cache';

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
     const data = await getData();
     const userIndex = data.users.findIndex(u => u.id === id);
     if (userIndex === -1) {
         throw new Error("User not found");
     }

     const user = data.users[userIndex];
     user.name = name;
     user.bio = bio;
     if (avatarDataUrl) {
       user.avatarUrl = avatarDataUrl;
     }
     
     await setData(data);

    // Revalidate paths to reflect changes immediately across the app
    revalidatePath('/settings');
    revalidatePath('/profile');
    revalidatePath('/', 'layout');
    
    return { success: true };

  } catch (error)_ {
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
    const data = await getData();
    const userIndex = data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const user = data.users[userIndex];
    user.name = name;
    user.bio = bio;
    user.interests = interests;
    user.onboarded = true;

    await setData(data);

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
