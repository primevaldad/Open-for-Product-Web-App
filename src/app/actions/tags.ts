'use server';

import { adminDb } from '@/lib/data.server';
import type { ServerActionResponse, GlobalTag } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/session.server';

const MAX_TAG_LENGTH = 35;

const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').slice(0, MAX_TAG_LENGTH);
};

/**
 * Creates a new global tag if it doesn't already exist.
 * This action is designed to be called from the tag input component when a user creates a new tag.
 */
export async function upsertTag(tag: {
  id: string;
  display: string;
}): Promise<ServerActionResponse<GlobalTag>> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    return { success: false, error: 'Authentication required.' };
  }

  const normalizedId = normalizeTag(tag.id);
  if (!normalizedId) {
    return { success: false, error: 'Invalid tag name.' };
  }

  const tagRef = adminDb.collection('tags').doc(normalizedId);

  try {
    let newTag: GlobalTag | undefined;

    await adminDb.runTransaction(async (transaction) => {
      const tagDoc = await transaction.get(tagRef);
      if (!tagDoc.exists) {
        const tagData: Omit<GlobalTag, 'usageCount'> & { usageCount: number } = {
          id: normalizedId,
          normalized: normalizedId,
          display: tag.display,
          isCategory: false, // New tags from users are never categories
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser.id,
          usageCount: 0, // Initial count is 0. It will be incremented when the user saves the form.
        };
        transaction.set(tagRef, tagData);
        newTag = tagData as GlobalTag;
      } else {
        newTag = tagDoc.data() as GlobalTag;
      }
    });

    if (newTag) {
        // The deepSerialize wrapper is not needed here as we are returning a plain object
        return { success: true, data: newTag };
    }

    // Fallback in case transaction completes but newTag is not set, which is unlikely.
    return { success: false, error: 'An unexpected error occurred during tag creation.' };

  } catch (error) {
    console.error('Failed to upsert tag:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: `Failed to create tag: ${message}` };
  }
}
