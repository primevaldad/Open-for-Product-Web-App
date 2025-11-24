'use server';

import { revalidatePath } from 'next/cache';
import { updateUser as updateUserInDb, findUserById } from '@/lib/data.server';
import type { ServerActionResponse, User } from '@/lib/types';

export async function updateUser(userId: string, userData: Partial<User>): Promise<ServerActionResponse<User>> {
  try {
    await updateUserInDb(userId, userData);
    const updatedUser = await findUserById(userId);
    if (!updatedUser) {
      return { success: false, error: 'Failed to retrieve updated user.' };
    }
    revalidatePath('/', 'layout'); // Revalidate all paths to reflect user changes
    return { success: true, data: updatedUser };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
