'use server';

import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { getAuthenticatedUser } from '@/lib/session.server';

// Ensure the Admin SDK is initialized (it will be a no-op if already initialized)
import '@/lib/firebase.server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Securely uploads an image to Firebase Storage using the Admin SDK.
 * This runs on the server, ensuring the upload is authenticated via
 * the user's Next.js session — not an anonymous Firebase client session.
 */
export async function uploadProjectImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'You must be logged in to upload images.' };
  }

  const file = formData.get('file') as File | null;
  const folder = formData.get('folder') as string | null;

  if (!file) {
    return { success: false, error: 'No file provided.' };
  }
  if (!folder) {
    return { success: false, error: 'No upload folder specified.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: 'File exceeds the 5MB size limit.' };
  }

  try {
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!storageBucket) {
      throw new Error('Storage bucket not configured.');
    }

    const bucket = admin.storage().bucket(storageBucket);

    // Sanitize filename and build storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}-${sanitizedName}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const downloadToken = randomUUID();

    const fileRef = bucket.file(filePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Use the standard Firebase Storage Download URL format
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${downloadToken}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('[uploadProjectImage] Upload failed:', error);
    return { success: false, error: 'Upload failed. Please try again.' };
  }
}
