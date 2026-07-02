'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { PlatformConfig, User, DecisionModel, ValueFlowBucket, FinancialSnapshot, ProjectGovernanceConfig } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function getPlatformConfigAction(): Promise<{ success: boolean; data?: PlatformConfig; error?: string }> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        const doc = await adminDb.collection('platform_config').doc('global_settings').get();
        const defaultGovernance = {
            decisionModel: 'project_lead_advisory' as DecisionModel,
            valueFlow: [
                { id: "contributors", label: "Contributors", percentage: 75, description: "Value distributed to people doing project work." },
                { id: "commons", label: "Community Commons", percentage: 15, description: "Shared project/ecosystem capacity: reusable assets, tools, documentation, templates, education, and community support." },
                { id: "long_term_stake", label: "Long-Term Stake", percentage: 10, description: "Reserved for long-term project alignment, sustainability, or future ownership/stake logic." }
            ] as ValueFlowBucket[],
            financialSnapshot: {
                creditOnHand: 0,
                neededForNextTasks: 0,
                alreadyDedicated: 0,
                remainingNeed: 0
            } as FinancialSnapshot
        };

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
                    defaultGovernance
                }
            };
        }
        
        const data = doc.data() as PlatformConfig;
        if (!data.defaultGovernance) {
            data.defaultGovernance = defaultGovernance;
        }
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
        
        if (config.defaultGovernance) {
            await cascadeGlobalGovernanceUpdates(config.defaultGovernance);
        }

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

export async function cascadeGovernanceUpdates(parentProjectId: string, parentConfig: ProjectGovernanceConfig) {
    try {
        const querySnapshot = await adminDb.collection('projects')
            .where('governanceConfig.source', '==', 'inherited')
            .where('governanceConfig.parentProjectId', '==', parentProjectId)
            .get();

        const promises = querySnapshot.docs.map(async (doc) => {
            const childData = doc.data();
            const childConfig = childData.governanceConfig as ProjectGovernanceConfig;
            
            if (childConfig) {
                childConfig.parentProjectTitle = parentConfig.parentProjectTitle || 'Parent Project';
                childConfig.decisionModel = parentConfig.decisionModel;
                childConfig.valueFlow = parentConfig.valueFlow.map(b => ({ ...b }));
                if (parentConfig.financialSnapshot) {
                    childConfig.financialSnapshot = { ...parentConfig.financialSnapshot };
                }
                childConfig.updatedAt = new Date().toISOString();
                childConfig.updatedBy = 'system_cascade';

                // Save and recurse cascade
                await adminDb.collection('projects').doc(doc.id).update({
                    governanceConfig: childConfig
                });
                await cascadeGovernanceUpdates(doc.id, childConfig);
            }
        });

        await Promise.all(promises);
    } catch (err) {
        console.error("Failed to cascade governance updates for parent: ", parentProjectId, err);
    }
}

export async function cascadeGlobalGovernanceUpdates(globalConfig: NonNullable<PlatformConfig['defaultGovernance']>) {
    try {
        const querySnapshot = await adminDb.collection('projects')
            .where('governanceConfig.source', '==', 'inherited')
            .where('governanceConfig.parentProjectId', '==', 'platform_default')
            .get();

        const promises = querySnapshot.docs.map(async (doc) => {
            const childData = doc.data();
            const childConfig = childData.governanceConfig as ProjectGovernanceConfig;
            
            if (childConfig) {
                childConfig.parentProjectTitle = 'Open for Product';
                childConfig.decisionModel = globalConfig.decisionModel;
                childConfig.valueFlow = globalConfig.valueFlow.map(b => ({ ...b }));
                if (globalConfig.financialSnapshot) {
                    childConfig.financialSnapshot = { ...globalConfig.financialSnapshot };
                }
                childConfig.updatedAt = new Date().toISOString();
                childConfig.updatedBy = 'system_cascade';

                await adminDb.collection('projects').doc(doc.id).update({
                    governanceConfig: childConfig
                });
                // Recurse to any child of this child project
                await cascadeGovernanceUpdates(doc.id, childConfig);
            }
        });

        await Promise.all(promises);
    } catch (err) {
        console.error("Failed to cascade global platform governance updates: ", err);
    }
}
