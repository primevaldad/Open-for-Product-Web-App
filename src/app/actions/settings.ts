'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserById, getAllTags } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { adminAuth } from '@/lib/firebase.server';
import { deepSerialize } from '@/lib/utils.server';
import { updateUser } from './user'; // Import the correct high-level action
import type { User, Tag } from '@/lib/types';

const UserSettingsSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  username: z.string().min(3, 'Username must be at least 3 characters').or(z.literal('')).optional(),
  bio: z.string().max(160, 'Bio must not be longer than 160 characters.').optional(),
  interests: z.array(z.string()).optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  steemUsername: z.string().optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});


const OnboardingSchema = z.object({
  id: z.string().min(1, { message: 'User ID is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }),
  bio: z.string().optional(),
  interests: z.array(z.string()).min(1, { message: 'Please select at least one interest.' }),
});

export async function getSettingsPageData() {
  'use server';
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return deepSerialize({ success: false, message: 'User not authenticated.' });
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
        return {
            success: false,
            error: "Invalid data provided.",
        };
    }

    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return { success: false, error: "User not found." };
        }
        
        // Use the centralized updateUser action
        const result = await updateUser(currentUser.id, validatedFields.data);

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Also update Firebase Auth if name has changed
        if (validatedFields.data.name) {
            await adminAuth.updateUser(currentUser.id, {
                displayName: validatedFields.data.name
            });
        }

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

  // Use the centralized updateUser action
  const result = await updateUser(id, {
    name,
    bio,
    interests,
    onboardingCompleted: true,
  });

  if (!result.success) {
      return { success: false, error: result.error };
  }

  return { success: true };
}
