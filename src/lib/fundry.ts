import type { FundryConfig, FundryFundingGoal, FundryAllocation, FundryContribution } from './types';

// Safe date conversion helper
export function toDate(val: any): Date {
    if (!val) return new Date();
    if (typeof val === 'string') return new Date(val);
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    return new Date(val);
}

export interface HydratedFundryGoal extends FundryFundingGoal {
    directedValue: number;
    lockedValue: number;
    confirmedValue: number;
    pendingValue: number;
    pledgedValue: number;
    placeholderValue: number;
    totalProgressValue: number; // Sum of confirmed, locked, pending, pledged, placeholder, and directed
    isFunded: boolean;
    isOverfunded: boolean;
}

export function calculateFundryMetrics(
    fundry: FundryConfig | undefined,
    goals: FundryFundingGoal[],
    allocations: FundryAllocation[],
    contributions: FundryContribution[]
) {
    if (!fundry || !fundry.enabled) {
        return {
            activePoolValue: 0,
            totalActiveCredits: 0,
            currentCreditValue: 0,
            hydratedGoals: goals.map(g => ({
                ...g,
                directedValue: 0,
                lockedValue: 0,
                confirmedValue: 0,
                pendingValue: 0,
                pledgedValue: 0,
                placeholderValue: 0,
                totalProgressValue: 0,
                isFunded: false,
                isOverfunded: false,
            } as HydratedFundryGoal)),
        };
    }

    const pool = fundry.pool || { confirmedAmount: 0, pendingCollectionAmount: 0, pledgedAmount: 0, placeholderAmount: 0 };
    const displayMode = fundry.valuation?.displayMode || 'planning';

    // 1. Calculate active pool value based on selected display mode
    let activePoolValue = 0;
    if (displayMode === 'confirmed_only') {
        activePoolValue = pool.confirmedAmount;
    } else if (displayMode === 'confirmed_plus_pending') {
        activePoolValue = pool.confirmedAmount + pool.pendingCollectionAmount + pool.pledgedAmount;
    } else if (displayMode === 'planning') {
        activePoolValue = pool.confirmedAmount + pool.pendingCollectionAmount + pool.pledgedAmount + pool.placeholderAmount;
    }

    const now = new Date();

    // 2. Filter allocations to active/locked
    // Active allocations are those that are not superseded, cancelled, or settled
    const activeAllocations = allocations.filter(a => 
        a.status === 'active' || a.status === 'locked'
    );

    // 3. Sum up total active allocated credits (ignoring locked allocations if they are fixed, but wait:
    // the value of unlocked credits is floating based on the active pool value divided by the total active credits.
    // Do locked allocations still count toward totalActiveCredits?
    // "totalActiveCredits: total number of active allocated credits."
    // Yes, they represent part of the allocated signal.
    const totalActiveCredits = activeAllocations.reduce((sum, a) => sum + a.creditsAllocated, 0);

    // 4. Calculate valuation per credit
    const currentCreditValue = totalActiveCredits > 0 ? activePoolValue / totalActiveCredits : 0;

    // 5. Hydrate goals with progress values
    const hydratedGoals = goals.map(goal => {
        // Direct contributions assigned to this goal
        const goalContributions = contributions.filter(c => c.goalId === goal.id);
        const confirmedValue = goalContributions.filter(c => c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0);
        const pendingValue = goalContributions.filter(c => c.status === 'pending_collection').reduce((sum, c) => sum + c.amount, 0);
        const pledgedValue = goalContributions.filter(c => c.status === 'pledged').reduce((sum, c) => sum + c.amount, 0);
        const placeholderValue = goalContributions.filter(c => c.status === 'placeholder').reduce((sum, c) => sum + c.amount, 0);

        // Find allocations assigned to this goal
        const goalAllocations = activeAllocations.filter(a => a.goalId === goal.id);
        
        let directedValue = 0;
        let lockedValue = 0;

        goalAllocations.forEach(alloc => {
            const isLocked = alloc.status === 'locked' || toDate(alloc.editableUntil) < now;
            if (isLocked) {
                // Locked allocation value is fixed
                const val = alloc.lockedValue !== null && alloc.lockedValue !== undefined
                    ? alloc.lockedValue
                    : alloc.creditsAllocated * currentCreditValue;
                lockedValue += val;
            } else {
                // Floating active allocation value
                directedValue += alloc.creditsAllocated * currentCreditValue;
            }
        });

        // Calculate total progress value
        // "progress using estimated/confirmed dollar values"
        const totalProgressValue = confirmedValue + lockedValue + pendingValue + pledgedValue + placeholderValue + directedValue;

        const isFunded = (confirmedValue + lockedValue) >= goal.minimumStartAmount;
        const isOverfunded = (confirmedValue + lockedValue) >= goal.targetAmount;

        // Evaluate funding status
        let fundingStatus: FundryFundingGoal['fundingStatus'] = 'unfunded';
        if (totalProgressValue === 0) {
            fundingStatus = 'unfunded';
        } else if (totalProgressValue < goal.minimumStartAmount) {
            fundingStatus = 'partially_directed';
        } else if (totalProgressValue >= goal.minimumStartAmount && (confirmedValue + lockedValue) < goal.minimumStartAmount) {
            // Directed meets minimum, but not locked/confirmed yet
            fundingStatus = 'directed_pending_lock';
        } else if ((confirmedValue + lockedValue) >= goal.minimumStartAmount) {
            // Confirmed/locked meets minimum
            fundingStatus = 'funded';
        }

        if (goal.targetAmount > 0 && (confirmedValue + lockedValue) >= goal.targetAmount) {
            fundingStatus = 'overfunded';
        }

        // Keep overridden project status (e.g. in_progress, completed) if set by project lead
        const finalFundingStatus = (goal.fundingStatus === 'completed' || goal.fundingStatus === 'in_progress')
            ? goal.fundingStatus
            : fundingStatus;

        return {
            ...goal,
            directedValue,
            lockedValue,
            confirmedValue,
            pendingValue,
            pledgedValue,
            placeholderValue,
            totalProgressValue,
            fundingStatus: finalFundingStatus,
            isFunded,
            isOverfunded,
        } as HydratedFundryGoal;
    });

    return {
        activePoolValue,
        totalActiveCredits,
        currentCreditValue,
        hydratedGoals,
    };
}
