'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { PlatformConfig, User } from '@/lib/types';

export async function getPlatformConfigAction(): Promise<{ success: boolean; data?: PlatformConfig; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const doc = await adminDb.collection('platform_config').doc('global_settings').get();
        if (!doc.exists) {
            // Return defaults if it doesn't exist
            return {
                success: true,
                data: {
                    id: 'global_settings',
                    activeAiModel: 'gemini-1.5-pro',
                    defaultFeaturesEnabled: {
                        jester: false,
                        queen: false,
                    },
                    projectOverrides: {},
                    adminUserIds: [], // We should check if the currentUser is an admin before letting them save, but for MVP we will allow it or rely on a hardcoded list.
                }
            };
        }
        
        const data = doc.data() as PlatformConfig;
        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updatePlatformConfigAction(config: PlatformConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        // Ensure user is admin
        const existing = await adminDb.collection('platform_config').doc('global_settings').get();
        if (existing.exists) {
            const existingData = existing.data() as PlatformConfig;
            // If there are existing admins, the currentUser MUST be one of them to save anything.
            if (existingData.adminUserIds?.length > 0 && !existingData.adminUserIds.includes(currentUser.id)) {
                return { success: false, error: 'Unauthorized. You are not a platform admin.' };
            }
        }

        await adminDb.collection('platform_config').doc('global_settings').set(config, { merge: true });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getAllUsersForAdminAction(): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const configDoc = await adminDb.collection('platform_config').doc('global_settings').get();
        if (configDoc.exists) {
            const config = configDoc.data() as PlatformConfig;
            if (config.adminUserIds?.length > 0 && !config.adminUserIds.includes(currentUser.id)) {
                return { success: false, error: 'Unauthorized' };
            }
        }

        const snapshot = await adminDb.collection('users').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: JSON.parse(JSON.stringify(users)) as User[] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
