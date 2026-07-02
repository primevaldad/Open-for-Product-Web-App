'use server';

import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById } from '@/lib/data.server';
import { revalidatePath } from 'next/cache';
import { toDate } from '@/lib/fundry';
import type { 
    ServerActionResponse, 
    FundryConfig, 
    FundryFundingGoal, 
    FundryAllocation, 
    FundryContribution,
    FundryLedgerEntry
} from '@/lib/types';

// Helper to check lead or admin authorization
async function checkAuthAndLeadStatus(projectId: string): Promise<{ authorized: boolean; error?: string; currentUser?: any; project?: any }> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { authorized: false, error: 'Authentication required.' };
    if (!currentUser.emailVerified) return { authorized: false, error: 'Please verify your email address.' };

    const project = await findProjectById(projectId, currentUser);
    if (!project) return { authorized: false, error: 'Project not found.' };

    const isLead = project.team.some((m: any) => m.userId === currentUser.id && m.role === 'lead');
    const isOwner = project.owner?.id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';

    if (!isLead && !isOwner && !isAdmin) {
        return { authorized: false, error: 'Permission denied. Leads or platform admins only.' };
    }

    return { authorized: true, currentUser, project };
}

// 1. Toggle Fundry On/Off
export async function toggleFundryAction(projectId: string, enabled: boolean): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const defaultPool = {
            currency: "USD" as const,
            confirmedAmount: 0,
            pendingCollectionAmount: 0,
            pledgedAmount: 0,
            placeholderAmount: 0,
            unallocatedConfirmedAmount: 0,
            unallocatedPendingAmount: 0
        };

        const defaultValuation = {
            displayMode: "planning" as const,
            currentCreditValue: 0,
            totalActiveCredits: 0,
            lastCalculatedAt: null
        };

        const defaultCreditSystem = {
            enabled: true,
            creditsPerAllocationWindow: 100,
            allocationWindowDays: 7,
            rollingLock: true,
            creditLabel: "Fundry Credits",
            allowReallocationBeforeLock: true
        };

        const defaultSettings = {
            allowParticipantAllocation: true,
            allowDelegation: true,
            requireLeadApprovalForSpending: true,
            allowSelfDirectedSpending: false
        };

        const defaultPayments = {
            paymentProcessorConnected: false,
            processorName: null,
            livePaymentsEnabled: false,
            manualContributionsEnabled: true
        };

        // If toggling on, merge default schema
        const updateData: any = {};
        if (enabled) {
            updateData.fundry = {
                enabled: true,
                mode: "planning",
                fundingStatus: "open",
                creditSystem: defaultCreditSystem,
                pool: defaultPool,
                valuation: defaultValuation,
                settings: defaultSettings,
                payments: defaultPayments
            };
        } else {
            updateData.fundry = {
                enabled: false,
                fundingStatus: "closed"
            };
        }

        await adminDb.collection('projects').doc(projectId).update(updateData);
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 2. Save Fundry Config
export async function saveFundryConfigAction(projectId: string, config: FundryConfig): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        await adminDb.collection('projects').doc(projectId).update({
            fundry: config
        });
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createFundingGoalAction(
    projectId: string,
    goal: Omit<FundryFundingGoal, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'directedValue' | 'lockedValue' | 'confirmedValue' | 'pendingValue' | 'pledgedValue' | 'placeholderValue' | 'spentAmount' | 'fundingStatus' | 'workStatus'>
): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const goalRef = adminDb.collection('projects').doc(projectId).collection('fundingGoals').doc();
        const newGoal: FundryFundingGoal = {
            ...goal,
            id: goalRef.id,
            projectId,
            directedValue: 0,
            lockedValue: 0,
            confirmedValue: 0,
            pendingValue: 0,
            pledgedValue: 0,
            placeholderValue: 0,
            spentAmount: 0,
            fundingStatus: "unfunded",
            workStatus: "not_started",
            createdBy: auth.currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await goalRef.set(newGoal);
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 4. Update Funding Goal
export async function updateFundingGoalAction(
    projectId: string,
    goalId: string,
    updates: Partial<FundryFundingGoal>
): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        await adminDb.collection('projects').doc(projectId).collection('fundingGoals').doc(goalId).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 5. Delete Funding Goal
export async function deleteFundingGoalAction(projectId: string, goalId: string): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        await adminDb.collection('projects').doc(projectId).collection('fundingGoals').doc(goalId).delete();
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 6. Allocate Credits Action
export async function allocateCreditsAction(
    projectId: string,
    allocationsList: { goalId: string; creditsAllocated: number; note?: string }[]
): Promise<ServerActionResponse<void>> {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { success: false, error: 'Authentication required.' };

    const project = await findProjectById(projectId, currentUser);
    if (!project) return { success: false, error: 'Project not found.' };

    // Check project membership (leads, contributors, participants all allowed if settings say so)
    const isMember = project.team.some((m: any) => m.userId === currentUser.id);
    const isOwner = project.owner?.id === currentUser.id;
    const isAdmin = currentUser.role === 'admin';
    if (!isMember && !isOwner && !isAdmin) {
        return { success: false, error: 'Only project members can allocate credits.' };
    }

    try {
        const allocationsRef = adminDb.collection('projects').doc(projectId).collection('fundingAllocations');
        
        // Fetch all current allocations for this user to check lock status and sum limits
        const snapshot = await allocationsRef.where('userId', '==', currentUser.id).get();
        const existingAllocations = snapshot.docs.map(doc => doc.data() as FundryAllocation);

        const now = new Date();
        const windowDays = project.fundry?.creditSystem?.allocationWindowDays || 7;
        const totalCreditsAllowed = project.fundry?.creditSystem?.creditsPerAllocationWindow || 100;

        // Separate locked vs active allocations
        const lockedAllocations = existingAllocations.filter(a => 
            a.status === 'locked' || (a.editableUntil && toDate(a.editableUntil) < now)
        );
        const activeAllocations = existingAllocations.filter(a => 
            a.status === 'active' && !(a.editableUntil && toDate(a.editableUntil) < now)
        );

        const lockedCreditsUsed = lockedAllocations.reduce((sum, a) => sum + a.creditsAllocated, 0);

        // Map updates/new credits requested
        let incomingCreditsRequested = 0;
        allocationsList.forEach(a => {
            if (a.creditsAllocated > 0) incomingCreditsRequested += a.creditsAllocated;
        });

        // Enforce credit capacity check
        if (lockedCreditsUsed + incomingCreditsRequested > totalCreditsAllowed) {
            return {
                success: false,
                error: `Credit limit exceeded. You have ${lockedCreditsUsed} credits locked. You can allocate at most ${totalCreditsAllowed - lockedCreditsUsed} additional credits.`
            };
        }

        const batch = adminDb.batch();

        // 1. Process active allocations: if they are not in the new requested list, cancel them (set creditsAllocated to 0)
        activeAllocations.forEach(existing => {
            const requested = allocationsList.find(r => r.goalId === existing.goalId);
            if (!requested || requested.creditsAllocated <= 0) {
                // Cancel this allocation
                const docRef = allocationsRef.doc(existing.id);
                batch.update(docRef, {
                    status: 'cancelled',
                    creditsAllocated: 0,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        // 2. Process incoming allocations list
        allocationsList.forEach(requested => {
            const existing = activeAllocations.find(e => e.goalId === requested.goalId);
            const editableUntil = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString();

            if (existing) {
                // Update existing allocation
                const docRef = allocationsRef.doc(existing.id);
                batch.update(docRef, {
                    creditsAllocated: requested.creditsAllocated,
                    note: requested.note || '',
                    editableUntil,
                    updatedAt: new Date().toISOString()
                });
            } else {
                if (requested.creditsAllocated > 0) {
                    // Create new allocation
                    const docRef = allocationsRef.doc();
                    const newAlloc: FundryAllocation = {
                        id: docRef.id,
                        projectId,
                        goalId: requested.goalId,
                        poolId: 'default',
                        userId: currentUser.id,
                        creditsAllocated: requested.creditsAllocated,
                        allocatedAt: now.toISOString(),
                        editableUntil,
                        lockedAt: null,
                        status: 'active',
                        estimatedValueAtAllocation: 0,
                        currentEstimatedValue: 0,
                        lockedValue: null,
                        note: requested.note || '',
                        createdAt: now.toISOString(),
                        updatedAt: now.toISOString()
                    };
                    batch.set(docRef, newAlloc);
                }
            }
        });

        await batch.commit();
        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 7. Add Contribution Action
export async function addContributionAction(
    projectId: string,
    contribution: Omit<FundryContribution, 'id' | 'projectId' | 'createdAt'>
): Promise<ServerActionResponse<void>> {
    const auth = await checkAuthAndLeadStatus(projectId);
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const contributionsRef = adminDb.collection('projects').doc(projectId).collection('fundingContributions');
        const docRef = contributionsRef.doc();

        const newContribution: FundryContribution = {
            ...contribution,
            id: docRef.id,
            projectId,
            createdAt: new Date().toISOString()
        };

        await docRef.set(newContribution);

        // Recalculate platform snapshots
        const snapshot = await contributionsRef.get();
        let confirmed = 0, pending = 0, pledged = 0, placeholder = 0;

        snapshot.docs.forEach(doc => {
            const c = doc.data() as FundryContribution;
            if (c.status === 'confirmed') confirmed += c.amount;
            else if (c.status === 'pending_collection') pending += c.amount;
            else if (c.status === 'pledged') pledged += c.amount;
            else if (c.status === 'placeholder') placeholder += c.amount;
        });

        // Update the aggregate pool amounts on the main project document
        await adminDb.collection('projects').doc(projectId).update({
            'fundry.pool.confirmedAmount': confirmed,
            'fundry.pool.pendingCollectionAmount': pending,
            'fundry.pool.pledgedAmount': pledged,
            'fundry.pool.placeholderAmount': placeholder
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
