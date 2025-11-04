'use server';

import { getAuthenticatedUser } from '@/lib/session.server';
import { User, ServerActionResponse } from '@/lib/types';

export async function getCurrentUser(): Promise<ServerActionResponse<User>> {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return { success: false, error: 'User not authenticated.' };
        }
        return { success: true, data: user };
    } catch (error) {
        console.error('[USERS_ACTION_TRACE] Error fetching current user:', error);
        return { success: false, error: 'An unknown error occurred.' };
    }
}
