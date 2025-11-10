'use server';

import { getAuthenticatedUser as getAuthenticatedUserFromSession } from '@/lib/session.server';
import { User, ServerActionResponse } from '@/lib/types';

export async function getAuthenticatedUser(): Promise<ServerActionResponse<User>> {
    try {
        const user = await getAuthenticatedUserFromSession();
        if (!user) {
            return { success: false, error: 'User not authenticated.' };
        }
        return { success: true, data: user };
    } catch (error) {
        console.error('[USERS_ACTION_TRACE] Error fetching current user:', error);
        return { success: false, error: 'An unknown error occurred.' };
    }
}
