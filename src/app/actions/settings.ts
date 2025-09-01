
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
     const userDocRef = doc(db, 'users', id);
     
     const updateData: any = { name, bio };
     if (avatarDataUrl) {
       updateData.avatarUrl = avatarDataUrl;
     }
     
     await updateDoc(userDocRef, updateData);

    // Revalidate paths to reflect changes immediately across the app
    revalidatePath('/settings');
    revalidatePath(`/profile/${id}`);
    revalidatePath('/', 'layout'); // Revalidate the whole layout to update UserNav avatar
    
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
    const userDocRef = doc(db, 'users', id);
    
    await updateDoc(userDocRef, {
      name,
      bio,
      interests,
      onboarded: true,
    });

    revalidatePath(`/profile/${id}`);
    revalidatePath('/onboarding');

  } catch (error) {
    return { 
        success: false, 
        error: error instanceof Error ? error.message : "An unknown error occurred." 
    };
  }
  
  redirect('/profile');
}
