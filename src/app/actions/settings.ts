
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';
import { db } from '@/lib/firebase-admin';

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
     const userDocRef = db.collection('users').doc(id);
     
     const updateData: any = { name, bio };
     if (avatarDataUrl) {
       updateData.avatarUrl = avatarDataUrl;
     }
     
     await userDocRef.update(updateData);

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
    const userDocRef = db.collection('users').doc(id);
    
    await userDocRef.update({
      name,
      bio,
      interests,
      onboarded: true,
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
