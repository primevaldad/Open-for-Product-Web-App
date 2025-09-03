
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
  email: z.string().email({ message: "Please enter a valid email."}),
  password: z.string().min(6, { message: "Password must be at least 6 characters."}).optional().or(z.literal('')),
  passwordConfirmation: z.string().optional(),
}).refine(data => {
    if (data.password && data.password !== data.passwordConfirmation) {
        return false;
    }
    return true;
}, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
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
    const zodError = validatedFields.error;
    const confirmationError = zodError.errors.find(e => e.path.includes('passwordConfirmation'));

    return {
      success: false,
      error: confirmationError ? confirmationError.message : "Invalid data provided.",
    };
  }

  const { id, name, bio, avatarDataUrl, email } = validatedFields.data;

  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
      return { success: false, error: "User not found." };
  }

  const user = mockUsers[userIndex];
  user.name = name;
  user.bio = bio;
  user.email = email;

  // In a real app, you would hash the password here.
  // We are not storing passwords in the mock data for this prototype.
  console.log("Password change requested, but not stored in mock data.");
  
  if (avatarDataUrl) {
    user.avatarUrl = avatarDataUrl;
  }
  
  mockUsers[userIndex] = user;
  console.log("Updated user settings in mock data (in-memory, will reset on server restart)");

  // Revalidate all paths that might display user information to ensure data consistency.
  // This is the systemic fix: revalidate the entire layout to catch all instances of user data.
  revalidatePath('/', 'layout');
  
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
