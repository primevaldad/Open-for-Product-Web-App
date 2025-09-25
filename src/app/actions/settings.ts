
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserById, updateUser as updateUserInDb } from '@/lib/data.server';
import { adminApp } from '@/lib/firebase.server';
import { getAuth } from 'firebase-admin/auth';

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

  const { id, name, bio, avatarDataUrl, email, password } = validatedFields.data;

  try {
    const user = await findUserById(id);
    if (!user) {
        return { success: false, error: "User not found." };
    }

    user.name = name;
    user.bio = bio;
    user.email = email;

    if (avatarDataUrl) {
      user.avatarUrl = avatarDataUrl;
    }

    await updateUserInDb(user);

    if (password) {
        await getAuth(adminApp).updateUser(id, { password });
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function updateOnboardingInfo(values: z.infer<typeof OnboardingSchema>) {
  const validatedFields = OnboardingSchema.safeParse(values);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid data provided.' };
  }

  const { id, name, bio, interests } = validatedFields.data;

  const user = await findUserById(id);
  if (!user) {
    return { success: false, error: "User not found." };
  }

  user.name = name;
  user.bio = bio;
  user.interests = interests;
  user.onboarded = true;

  await updateUserInDb(user);

  revalidatePath('/', 'layout');

  return { success: true };
}
