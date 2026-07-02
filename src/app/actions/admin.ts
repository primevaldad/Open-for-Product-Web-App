'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { PlatformConfig, User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function getPlatformConfigAction(): Promise<{ success: boolean; data?: PlatformConfig; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        if (currentUser.role !== 'admin') {
            return { success: false, error: 'Unauthorized. You are not a platform admin.' };
        }

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
                    adminUserIds: [],
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

        if (currentUser.role !== 'admin') {
            return { success: false, error: 'Unauthorized. You are not a platform admin.' };
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

        if (currentUser.role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        const snapshot = await adminDb.collection('users').get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: JSON.parse(JSON.stringify(users)) as User[] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function setUserAdminStatusAction(targetUserId: string, isAdmin: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        if (currentUser.role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        if (targetUserId === currentUser.id && !isAdmin) {
            return { success: false, error: 'You cannot remove admin status from yourself.' };
        }

        await adminDb.collection('users').doc(targetUserId).set({
            role: isAdmin ? 'admin' : FieldValue.delete()
        }, { merge: true });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
