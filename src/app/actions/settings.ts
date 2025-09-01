
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { mockUsers } from '@/lib/mock-data';

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

  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
      return { success: false, error: "User not found." };
  }

  const user = mockUsers[userIndex];
  user.name = name;
  user.bio = bio;
  if (avatarDataUrl) {
    user.avatarUrl = avatarDataUrl;
  }
  
  mockUsers[userIndex] = user;
  console.log("Updated user settings in mock data (in-memory, will reset on server restart)");

  // Revalidate paths to reflect changes immediately across the app
  revalidatePath('/settings');
  revalidatePath(`/profile/${id}`);
  revalidatePath('/', 'layout'); // Revalidate the whole layout to update UserNav avatar
  
  return { success: true };
}

export async function updateOnboardingInfo(values: z.infer<typeof OnboardingSchema>) {
  const validatedFields = OnboardingSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { id, name, bio, interests } = validatedFields.data;

  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return { success: false, error: "User not found." };
  }

  const user = mockUsers[userIndex];
  user.name = name;
  user.bio = bio;
  user.interests = interests;
  user.onboarded = true;
  
  mockUsers[userIndex] = user;
  console.log("Updated onboarding info in mock data (in-memory, will reset on server restart)");

  revalidatePath(`/profile/${id}`);
  revalidatePath('/onboarding');
  
  redirect('/profile');
}
