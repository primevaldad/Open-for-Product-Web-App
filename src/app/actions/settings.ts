
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserById, updateUser as updateUserInDb, getAllTags } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { adminApp } from '@/lib/firebase.server';
import { getAuth } from 'firebase-admin/auth';
import type { FirebaseError } from 'firebase-admin/app';
import { deepSerialize } from '@/lib/utils.server';
import type { User, Tag } from '@/lib/types';

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

export async function getSettingsPageData() {
  'use server';
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return deepSerialize({ success: false, error: 'User not authenticated.' });
    }
    
    const allTags = await getAllTags();

    return deepSerialize({
      success: true,
      user,
      allTags,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return deepSerialize({
      success: false,
      error: `Failed to load settings data: ${errorMessage}`,
    });
  }
}

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
  } catch (error) {
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        errorMessage = (error as any).message;
    }
    return { success: false, error: errorMessage };
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
  user.onboardingCompleted = true;

  await updateUserInDb(user);

  revalidatePath('/', 'layout');

  return { success: true };
}
