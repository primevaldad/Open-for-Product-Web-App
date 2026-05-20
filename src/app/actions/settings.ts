'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserById, getAllTags } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { adminAuth, adminStorage } from '@/lib/firebase.server';
import { deepSerialize } from '@/lib/utils.server';
import { updateUser } from './user';
import type { User, GlobalTag } from '@/lib/types';

const UserSettingsSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  username: z.string().min(3, 'Username must be at least 3 characters').or(z.literal('')).optional(),
  bio: z.string().max(2000, 'Bio must not be longer than 2000 characters.').optional(),
  interests: z.array(z.union([
    z.string(),
    z.object({ id: z.string(), display: z.string() })
  ])).optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  steemUsername: z.string().optional(),
  steemFeedPreference: z.enum(['all', 'blog', 'none']).optional(),
  steemTestnetEnabled: z.boolean().optional(),
  steemIconOverlay: z.boolean().optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});


const OnboardingSchema = z.object({
  id: z.string().min(1, { message: 'User ID is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }),
  bio: z.string().optional(),
  interests: z.array(z.union([
    z.string(),
    z.object({ id: z.string(), display: z.string() })
  ])).min(1, { message: 'Please select at least one interest.' }),
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
        const result = await updateUser(currentUser.id, validatedFields.data as any);

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
    interests: interests as any,
    onboardingCompleted: true,
  });

  if (!result.success) {
      return { success: false, error: result.error };
  }

  return { success: true };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadAvatarAction(base64DataUrl: string): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { success: false, error: 'Not authenticated.' };
    }

    // --- Validate ---
    if (!base64DataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid image format.' };
    }
    const [header, base64Data] = base64DataUrl.split(',');
    if (!base64Data) {
      return { success: false, error: 'Invalid image data.' };
    }
    const mimeMatch = header.match(/data:(image\/[a-zA-Z+]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.byteLength > MAX_AVATAR_BYTES) {
      return { success: false, error: 'Image is too large. Maximum size is 5MB.' };
    }

    // --- Upload to Firebase Storage ---
    const filePath = `avatars/${currentUser.id}/avatar.png`;
    const file = adminStorage.file(filePath);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
      // Make the file publicly accessible
      public: true,
    });

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${adminStorage.name}/${filePath}`;
    // Append cache-bust so browsers reload the image after update
    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    // --- Persist to Firestore and Firebase Auth ---
    const updateResult = await updateUser(currentUser.id, { avatarUrl });
    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }
    await adminAuth.updateUser(currentUser.id, { photoURL: publicUrl });

    revalidatePath('/', 'layout');
    return { success: true, avatarUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: msg };
  }
}
