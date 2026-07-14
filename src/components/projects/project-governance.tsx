'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveProjectGovernanceConfigAction } from '@/app/actions/projects';
import { 
    toggleFundryAction, 
    createFundingGoalAction, 
    updateFundingGoalAction, 
    deleteFundingGoalAction, 
    allocateCreditsAction, 
    addContributionAction 
} from '@/app/actions/fundry';
import { createSquareCheckoutLinkAction, getContributionStatusAction } from '@/app/actions/square';
import { calculateFundryMetrics, toDate } from '@/lib/fundry';
import type { 
    HydratedProject, 
    User, 
    ProjectGovernanceConfig, 
    ValueFlowBucket, 
    DecisionModel, 
    GovernanceSource, 
    CooperativeDecision, 
    FinancialSnapshot,
    FundryConfig,
    FundryFundingGoal,
    FundryAllocation,
    FundryContribution
} from '@/lib/types';
import { 
    Shield, Sparkles, Check, AlertCircle, Plus, Trash2, ArrowRight, Lock, 
    Edit2, RotateCcw, X, Loader2, DollarSign, Calendar, Sliders, Users, 
    Target, Unlock, AlertTriangle 
} from 'lucide-react';

interface ProjectGovernanceProps {
    project: HydratedProject;
    currentUser: User | null;
    isLead: boolean;
    parentOptions?: Array<{ id: string; title: string; type: 'project' | 'collection' | 'platform' }>;
    fundingGoals?: FundryFundingGoal[];
    fundingAllocations?: FundryAllocation[];
    fundingContributions?: FundryContribution[];
    renderSection?: 'governance' | 'fundry';
}

const defaultGovernanceConfig: ProjectGovernanceConfig = {
    source: "inherited",
    parentProjectTitle: "Open for Product",
    parentProjectId: "platform_default",
    decisionModel: "project_lead_advisory",
    valueFlow: [
        {
            id: "contributors",
            label: "Contributors",
            percentage: 75,
            description: "Value distributed to people doing project work.",
        },
        {
            id: "commons",
            label: "Community Commons",
            percentage: 15,
            description: "Shared project/ecosystem capacity: reusable assets, tools, documentation, templates, education, and community support.",
        },
        {
            id: "long_term_stake",
            label: "Long-Term Stake",
            percentage: 10,
            description: "Reserved for long-term project alignment, sustainability, or future ownership/stake logic.",
        },
    ],
    lastDecision: {
        id: "default-last-decision",
        title: "Contributor agreement updated",
        status: "approved",
        date: "2026-06-28",
    },
    nextDecision: {
        id: "default-next-decision",
        title: "Governance review",
        status: "scheduled",
        date: "2026-07-15",
    },
    financialSnapshot: {
        creditOnHand: 0,
        neededForNextTasks: 0,
        alreadyDedicated: 0,
        remainingNeed: 0
    }
};

// Check if saved config has structure errors and sanitize it
function getSanitizedConfig(config: any): { isMalformed: boolean; data: ProjectGovernanceConfig } {
    if (config === undefined || config === null) {
        return { isMalformed: false, data: defaultGovernanceConfig };
    }
    if (typeof config !== 'object') {
        return { isMalformed: true, data: defaultGovernanceConfig };
    }
    
    const hasSource = ['inherited', 'custom', 'not_configured'].includes(config.source);
    const hasDecisionModel = ['project_lead', 'project_lead_advisory', 'majority_vote', 'consensus', 'parent_inherited'].includes(config.decisionModel);
    const hasValueFlow = Array.isArray(config.valueFlow) && config.valueFlow.every((b: any) => 
        b && typeof b === 'object' && typeof b.id === 'string' && typeof b.label === 'string' && typeof b.percentage === 'number'
    );
    
    if (!hasSource || !hasDecisionModel || !hasValueFlow) {
        return { isMalformed: true, data: defaultGovernanceConfig };
    }
    
    const lastDecision = config.lastDecision ? {
        id: String(config.lastDecision.id || 'last-decision'),
        title: String(config.lastDecision.title || ''),
        status: ['draft', 'scheduled', 'approved', 'rejected', 'completed'].includes(config.lastDecision.status) ? config.lastDecision.status : 'approved',
        date: config.lastDecision.date ? String(config.lastDecision.date) : ''
    } : undefined;

    const nextDecision = config.nextDecision ? {
        id: String(config.nextDecision.id || 'next-decision'),
        title: String(config.nextDecision.title || ''),
        status: ['draft', 'scheduled', 'approved', 'rejected', 'completed'].includes(config.nextDecision.status) ? config.nextDecision.status : 'scheduled',
        date: config.nextDecision.date ? String(config.nextDecision.date) : ''
    } : undefined;

    const financialSnapshot = config.financialSnapshot ? {
        creditOnHand: typeof config.financialSnapshot.creditOnHand === 'number' ? config.financialSnapshot.creditOnHand : 0,
        neededForNextTasks: typeof config.financialSnapshot.neededForNextTasks === 'number' ? config.financialSnapshot.neededForNextTasks : 0,
        alreadyDedicated: typeof config.financialSnapshot.alreadyDedicated === 'number' ? config.financialSnapshot.alreadyDedicated : 0,
        remainingNeed: typeof config.financialSnapshot.remainingNeed === 'number' ? config.financialSnapshot.remainingNeed : 0,
    } : {
        creditOnHand: 0,
        neededForNextTasks: 0,
        alreadyDedicated: 0,
        remainingNeed: 0
    };

    return {
        isMalformed: false,
        data: {
            source: config.source,
            parentProjectId: config.parentProjectId || 'platform_default',
            parentProjectTitle: config.parentProjectTitle || 'Open for Product',
            decisionModel: config.decisionModel,
            valueFlow: config.valueFlow.map((b: any) => ({
                id: b.id,
                label: b.label,
                percentage: b.percentage,
                description: b.description || ''
            })),
            lastDecision,
            nextDecision,
            financialSnapshot,
            updatedAt: config.updatedAt,
            updatedBy: config.updatedBy
        }
    };
}

const EMPTY_ARRAY: any[] = [];

export default function ProjectGovernance({ 
    project, 
    currentUser, 
    isLead, 
    parentOptions = EMPTY_ARRAY,
    fundingGoals = EMPTY_ARRAY,
    fundingAllocations = EMPTY_ARRAY,
    fundingContributions = EMPTY_ARRAY,
    renderSection
}: ProjectGovernanceProps) {
    const { toast } = useToast();
    const router = useRouter();

    // 1. Resolve role-based visibility
    const isLeadOrAdmin = useMemo(() => {
        return isLead || currentUser?.role === 'admin' || project.owner?.id === currentUser?.id;
    }, [isLead, currentUser, project.owner, project.id]);

    const isTeamMember = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        if (project.owner?.id === currentUser.id) return true;
        return project.team.some(member => member.userId === currentUser.id);
    }, [currentUser, project.team, project.owner]);

    const isNonMember = !currentUser || !isTeamMember;

    // Sanitize config on load to handle malformed records gracefully
    const { isMalformed, data: initialConfig } = useMemo(() => {
        return getSanitizedConfig(project.governanceConfig);
    }, [project.governanceConfig]);

    // 2. Editing states
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form inputs states
    const [source, setSource] = useState<GovernanceSource>(initialConfig.source);
    const [parentProjectId, setParentProjectId] = useState<string>(initialConfig.parentProjectId || 'platform_default');
    const [parentProjectTitle, setParentProjectTitle] = useState<string>(initialConfig.parentProjectTitle || 'Open for Product');
    const [decisionModel, setDecisionModel] = useState<DecisionModel>(initialConfig.decisionModel);
    const [valueFlowBuckets, setValueFlowBuckets] = useState<ValueFlowBucket[]>(initialConfig.valueFlow);
    
    // Decisions state
    const [lastDecision, setLastDecision] = useState<CooperativeDecision>(() => {
        const ld = initialConfig.lastDecision || { id: 'last-decision', title: '', status: 'approved', date: '' };
        if (!ld.date || ld.date.trim() === '') {
            ld.date = new Date().toISOString().split('T')[0];
        }
        return { ...ld };
    });
    const [nextDecision, setNextDecision] = useState<CooperativeDecision>(
        initialConfig.nextDecision || { id: 'next-decision', title: '', status: 'scheduled', date: '' }
    );

    // Financial Snapshot state
    const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot>(
        initialConfig.financialSnapshot || { creditOnHand: 0, neededForNextTasks: 0, alreadyDedicated: 0, remainingNeed: 0 }
    );

    // --- Fundry State Variables ---
    const [togglingFundry, setTogglingFundry] = useState(false);
    const [myAllocations, setMyAllocations] = useState<Record<string, number>>({});
    const [savingAllocations, setSavingAllocations] = useState(false);

    // Goal Form Modal State
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<FundryFundingGoal | null>(null);
    const [savingGoal, setSavingGoal] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [goalDescription, setGoalDescription] = useState('');
    const [goalCategory, setGoalCategory] = useState<FundryFundingGoal['category']>('tools');
    const [goalMinStart, setGoalMinStart] = useState<number>(0);
    const [goalTarget, setGoalTarget] = useState<number>(0);
    const [goalPriority, setGoalPriority] = useState<FundryFundingGoal['priority']>('medium');
    const [goalVisibility, setGoalVisibility] = useState<FundryFundingGoal['visibility']>('public');
    const [goalNotes, setGoalNotes] = useState('');

    // Contribution Form Modal State
    const [isContribModalOpen, setIsContribModalOpen] = useState(false);
    const [savingContrib, setSavingContrib] = useState(false);
    const [contribName, setContribName] = useState('');
    const [contribAmount, setContribAmount] = useState<number>(0);
    const [contribType, setContribType] = useState<FundryContribution['contributionType']>('manual');
    const [contribStatus, setContribStatus] = useState<FundryContribution['status']>('confirmed');
    const [contribGoalId, setContribGoalId] = useState<string>('pool_general');
    const [contribNote, setContribNote] = useState('');

    // Square Checkout Modal State
    const [isSquareModalOpen, setIsSquareModalOpen] = useState(false);
    const [squareAmount, setSquareAmount] = useState<number>(25);
    const [squareName, setSquareName] = useState(currentUser?.name || '');
    const [squareEmail, setSquareEmail] = useState(currentUser?.email || '');
    const [squareGoalId, setSquareGoalId] = useState<string>('pool_general');
    const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

    // Verification Overlay State
    const [verifyingContributionId, setVerifyingContributionId] = useState<string | null>(null);
    const [isVerifyingOverlayOpen, setIsVerifyingOverlayOpen] = useState(false);
    const [verificationState, setVerificationState] = useState<'loading' | 'confirmed' | 'pending' | 'failed'>('loading');

    // Sync my allocations when database allocations array changes
    useEffect(() => {
        if (currentUser && fundingAllocations) {
            const now = new Date();
            const userActive = fundingAllocations.filter(a => 
                a.userId === currentUser.id && 
                a.status === 'active' && 
                !(a.editableUntil && toDate(a.editableUntil) < now)
            );
            const initialMap: Record<string, number> = {};
            userActive.forEach(a => {
                initialMap[a.goalId] = a.creditsAllocated;
            });
            setMyAllocations(initialMap);
        }
    }, [currentUser, fundingAllocations]);

    // Check URL parameters for redirect return from Square Checkout
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment_status');
        const contributionId = params.get('contribution_id');
        
        if (paymentStatus === 'return' && contributionId) {
            setVerifyingContributionId(contributionId);
            setIsVerifyingOverlayOpen(true);
            
            // Clean payment query params from the URL
            const newUrl = window.location.pathname + '?tab=fundry';
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    // Verification status polling effect
    useEffect(() => {
        if (!isVerifyingOverlayOpen || !verifyingContributionId) return;

        let attempts = 0;
        const maxAttempts = 6; // up to 12 seconds
        let isStopped = false;

        const checkStatus = async () => {
            if (isStopped) return;
            const res = await getContributionStatusAction(project.id, verifyingContributionId);
            if (res.success && res.data) {
                const contribution = res.data;
                if (contribution.status === 'confirmed') {
                    setVerificationState('confirmed');
                    router.refresh();
                    return;
                } else if (
                    contribution.status === 'failed' || 
                    contribution.status === 'cancelled'
                ) {
                    setVerificationState('failed');
                    return;
                }
            }

            attempts += 1;
            if (attempts >= maxAttempts) {
                setVerificationState('pending');
                router.refresh();
            } else {
                setTimeout(checkStatus, 2000);
            }
        };

        setVerificationState('loading');
        checkStatus();

        return () => {
            isStopped = true;
        };
    }, [isVerifyingOverlayOpen, verifyingContributionId, project.id]);

    // Calculate Fundry Metrics Dynamically
    const fundryConfig = project.fundry;
    const { activePoolValue, totalActiveCredits, currentCreditValue, hydratedGoals } = useMemo(() => {
        return calculateFundryMetrics(fundryConfig, fundingGoals, fundingAllocations, fundingContributions);
    }, [fundryConfig, fundingGoals, fundingAllocations, fundingContributions]);

    const lockedCreditsUsed = useMemo(() => {
        if (!currentUser) return 0;
        const now = new Date();
        const userLocked = fundingAllocations.filter(a => 
            a.userId === currentUser.id && 
            (a.status === 'locked' || (a.editableUntil && toDate(a.editableUntil) < now))
        );
        return userLocked.reduce((sum, a) => sum + a.creditsAllocated, 0);
    }, [currentUser, fundingAllocations]);

    const myTotalCreditsAllocated = useMemo(() => {
        return Object.values(myAllocations).reduce((sum, v) => sum + v, 0);
    }, [myAllocations]);

    const remainingAvailableCredits = Math.max(0, 100 - lockedCreditsUsed - myTotalCreditsAllocated);

    // Fundry Actions Handlers
    const handleToggleFundry = async (enabled: boolean) => {
        setTogglingFundry(true);
        try {
            const res = await toggleFundryAction(project.id, enabled);
            if (res.success) {
                toast({
                    title: "Success",
                    description: enabled ? "Fundry enabled for this project." : "Fundry disabled for this project."
                });
                router.refresh();
            } else {
                toast({
                    title: "Action Failed",
                    description: res.error || "An unexpected error occurred.",
                    variant: "destructive"
                });
            }
        } catch (e: any) {
            toast({
                title: "Error",
                description: e.message || "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setTogglingFundry(false);
        }
    };

    const handleCreditChange = (goalId: string, val: number) => {
        setMyAllocations(prev => {
            const copy = { ...prev };
            if (val <= 0) {
                delete copy[goalId];
            } else {
                copy[goalId] = val;
            }
            return copy;
        });
    };

    const handleSaveAllocations = async () => {
        if (lockedCreditsUsed + myTotalCreditsAllocated > 100) {
            toast({
                title: "Allocation Error",
                description: `You cannot allocate more than 100 credits. (Used: ${lockedCreditsUsed + myTotalCreditsAllocated} credits).`,
                variant: "destructive"
            });
            return;
        }

        setSavingAllocations(true);
        try {
            const list = hydratedGoals.map(goal => ({
                goalId: goal.id,
                creditsAllocated: myAllocations[goal.id] || 0
            }));

            const res = await allocateCreditsAction(project.id, list);
            if (res.success) {
                toast({
                    title: "Allocations Saved",
                    description: "Your Fundry credits have been directed successfully."
                });
                router.refresh();
            } else {
                toast({
                    title: "Save Failed",
                    description: res.error || "An unexpected error occurred.",
                    variant: "destructive"
                });
            }
        } catch (e: any) {
            toast({
                title: "Error",
                description: e.message || "An unexpected network error occurred.",
                variant: "destructive"
            });
        } finally {
            setSavingAllocations(false);
        }
    };

    const handleGoalModalOpen = (goalToEdit?: FundryFundingGoal) => {
        if (goalToEdit) {
            setEditingGoal(goalToEdit);
            setGoalTitle(goalToEdit.title);
            setGoalDescription(goalToEdit.description);
            setGoalCategory(goalToEdit.category);
            setGoalMinStart(goalToEdit.minimumStartAmount);
            setGoalTarget(goalToEdit.targetAmount);
            setGoalPriority(goalToEdit.priority);
            setGoalVisibility(goalToEdit.visibility);
            setGoalNotes(goalToEdit.notes || '');
        } else {
            setEditingGoal(null);
            setGoalTitle('');
            setGoalDescription('');
            setGoalCategory('tools');
            setGoalMinStart(0);
            setGoalTarget(0);
            setGoalPriority('medium');
            setGoalVisibility('public');
            setGoalNotes('');
        }
        setIsGoalModalOpen(true);
    };

    const handleSaveGoal = async () => {
        if (!goalTitle.trim()) {
            toast({ title: "Validation Error", description: "Title cannot be empty.", variant: "destructive" });
            return;
        }
        if (goalMinStart < 0 || goalTarget < 0) {
            toast({ title: "Validation Error", description: "Amounts must be non-negative.", variant: "destructive" });
            return;
        }
        if (goalMinStart > goalTarget) {
            toast({ title: "Validation Error", description: "Minimum to start amount cannot exceed full target amount.", variant: "destructive" });
            return;
        }

        setSavingGoal(true);
        try {
            const goalData = {
                title: goalTitle,
                description: goalDescription,
                category: goalCategory,
                minimumStartAmount: goalMinStart,
                targetAmount: goalTarget,
                priority: goalPriority,
                visibility: goalVisibility,
                notes: goalNotes,
                dueDate: null,
                assignedOwnerId: null
            };

            let res;
            if (editingGoal) {
                res = await updateFundingGoalAction(project.id, editingGoal.id, goalData);
            } else {
                res = await createFundingGoalAction(project.id, goalData);
            }

            if (res.success) {
                toast({
                    title: "Goal Saved",
                    description: editingGoal ? "Funding goal updated successfully." : "Funding goal created successfully."
                });
                setIsGoalModalOpen(false);
                router.refresh();
            } else {
                toast({
                    title: "Error Saving Goal",
                    description: res.error || "An unexpected error occurred.",
                    variant: "destructive"
                });
            }
        } catch (e: any) {
            toast({
                title: "Error",
                description: e.message || "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setSavingGoal(false);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (confirm("Are you sure you want to delete this funding goal? All active credit allocations to it will be cancelled.")) {
            try {
                const res = await deleteFundingGoalAction(project.id, goalId);
                if (res.success) {
                    toast({ title: "Goal Deleted", description: "Funding goal removed successfully." });
                    router.refresh();
                } else {
                    toast({ title: "Action Failed", description: res.error || "Could not delete goal.", variant: "destructive" });
                }
            } catch (e: any) {
                toast({ title: "Error", description: e.message || "An error occurred.", variant: "destructive" });
            }
        }
    };

    const handleSaveContribution = async () => {
        if (contribAmount <= 0) {
            toast({ title: "Validation Error", description: "Contribution amount must be positive.", variant: "destructive" });
            return;
        }
        if (!contribName.trim()) {
            toast({ title: "Validation Error", description: "Contributor name is required.", variant: "destructive" });
            return;
        }

        setSavingContrib(true);
        try {
            const contribData = {
                contributorId: null,
                contributorName: contribName,
                amount: contribAmount,
                currency: "USD" as const,
                contributionType: contribType,
                status: contribStatus,
                paymentProcessor: null,
                externalReferenceId: null,
                goalId: contribGoalId === 'pool_general' ? null : contribGoalId,
                note: contribNote,
                confirmedAt: contribStatus === 'confirmed' ? new Date().toISOString() : null
            };

            const res = await addContributionAction(project.id, contribData);
            if (res.success) {
                toast({ title: "Contribution Added", description: "Funding contribution recorded successfully." });
                setIsContribModalOpen(false);
                setContribName('');
                setContribAmount(0);
                setContribNote('');
                setContribGoalId('pool_general');
                router.refresh();
            } else {
                toast({ title: "Action Failed", description: res.error || "Could not add contribution.", variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "An error occurred.", variant: "destructive" });
        } finally {
            setSavingContrib(false);
        }
    };

    const handleSquareCheckout = async () => {
        if (squareAmount < 1) {
            toast({ title: "Validation Error", description: "Contribution amount must be at least $1.00 USD.", variant: "destructive" });
            return;
        }
        if (!squareName.trim()) {
            toast({ title: "Validation Error", description: "Contributor name is required.", variant: "destructive" });
            return;
        }

        setIsCreatingCheckout(true);
        try {
            const res = await createSquareCheckoutLinkAction(
                project.id,
                squareAmount,
                squareGoalId,
                squareName,
                squareEmail
            );
            if (res.success && res.data) {
                toast({ title: "Redirecting...", description: "Connecting to Square Checkout securely..." });
                window.location.href = res.data.checkoutUrl;
            } else {
                toast({ title: "Checkout Error", description: res.error || "Failed to create payment link.", variant: "destructive" });
                setIsCreatingCheckout(false);
            }
        } catch (e: any) {
            toast({ title: "Checkout Error", description: e.message || "Failed to connect to Square.", variant: "destructive" });
            setIsCreatingCheckout(false);
        }
    };

    // Sync form state if DB project config changes
    useEffect(() => {
        setSource(initialConfig.source);
        setParentProjectId(initialConfig.parentProjectId || 'platform_default');
        setParentProjectTitle(initialConfig.parentProjectTitle || 'Open for Product');
        setDecisionModel(initialConfig.decisionModel);
        setValueFlowBuckets(initialConfig.valueFlow.map(b => ({ ...b })));
        
        const ld = initialConfig.lastDecision || { id: 'last-decision', title: '', status: 'approved', date: '' };
        if (!ld.date || ld.date.trim() === '') {
            ld.date = new Date().toISOString().split('T')[0];
        }
        setLastDecision({ ...ld });

        setNextDecision(initialConfig.nextDecision || { id: 'next-decision', title: '', status: 'scheduled', date: '' });
        setFinancialSnapshot(initialConfig.financialSnapshot || { creditOnHand: 0, neededForNextTasks: 0, alreadyDedicated: 0, remainingNeed: 0 });
    }, [initialConfig]);

    // Allocations sum validation
    const totalPercentage = useMemo(() => {
        return valueFlowBuckets.reduce((acc, curr) => acc + curr.percentage, 0);
    }, [valueFlowBuckets]);

    const isValidAllocation = totalPercentage === 100;
    const hasNegativeAllocation = valueFlowBuckets.some(b => b.percentage < 0);
    const hasEmptyLabels = valueFlowBuckets.some(b => !b.label || b.label.trim() === '');

    // Form Handlers
    const handleSliderChange = (id: string, val: number[]) => {
        setValueFlowBuckets(prev => prev.map(b => b.id === id ? { ...b, percentage: val[0] } : b));
    };

    const handleLabelChange = (id: string, newLabel: string) => {
        setValueFlowBuckets(prev => prev.map(b => b.id === id ? { ...b, label: newLabel } : b));
    };

    const handleAddBucket = () => {
        const id = `custom_${Date.now()}`;
        setValueFlowBuckets(prev => [
            ...prev,
            { id, label: 'Custom Allocation', percentage: 0, description: 'User defined allocation bucket.' }
        ]);
    };

    const handleRemoveBucket = (id: string) => {
        setValueFlowBuckets(prev => prev.filter(b => b.id !== id));
    };

    const handleSnapshotFieldChange = (field: keyof FinancialSnapshot, value: string) => {
        const parsed = parseFloat(value);
        setFinancialSnapshot(prev => ({
            ...prev,
            [field]: isNaN(parsed) ? 0 : parsed
        }));
    };

    // Reset back to defaults or parent overrides
    const handleReset = () => {
        if (confirm("Are you sure you want to reset all governance settings to platform defaults? This will overwrite your current unsaved edits.")) {
            setSource(defaultGovernanceConfig.source);
            setParentProjectId(defaultGovernanceConfig.parentProjectId || 'platform_default');
            setParentProjectTitle(defaultGovernanceConfig.parentProjectTitle || 'Open for Product');
            setDecisionModel(defaultGovernanceConfig.decisionModel);
            setValueFlowBuckets(defaultGovernanceConfig.valueFlow.map(b => ({ ...b })));
            setLastDecision(defaultGovernanceConfig.lastDecision || { id: 'last-decision', title: '', status: 'approved', date: '' });
            setNextDecision(defaultGovernanceConfig.nextDecision || { id: 'next-decision', title: '', status: 'scheduled', date: '' });
            setFinancialSnapshot(defaultGovernanceConfig.financialSnapshot || { creditOnHand: 0, neededForNextTasks: 0, alreadyDedicated: 0, remainingNeed: 0 });
            toast({
                title: "Reset Configuration",
                description: "Form reset to default settings. Click 'Save' to persist this to Firestore."
            });
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Restore initial config values
        setSource(initialConfig.source);
        setParentProjectId(initialConfig.parentProjectId || 'platform_default');
        setParentProjectTitle(initialConfig.parentProjectTitle || 'Open for Product');
        setDecisionModel(initialConfig.decisionModel);
        setValueFlowBuckets(initialConfig.valueFlow.map(b => ({ ...b })));
        setLastDecision(initialConfig.lastDecision || { id: 'last-decision', title: '', status: 'approved', date: '' });
        setNextDecision(initialConfig.nextDecision || { id: 'next-decision', title: '', status: 'scheduled', date: '' });
        setFinancialSnapshot(initialConfig.financialSnapshot || { creditOnHand: 0, neededForNextTasks: 0, alreadyDedicated: 0, remainingNeed: 0 });
    };

    const handleSave = async () => {
        // Validation Checks
        if (hasEmptyLabels) {
            toast({
                title: "Validation Error",
                description: "All Value Flow buckets must have a label.",
                variant: "destructive"
            });
            return;
        }

        if (hasNegativeAllocation) {
            toast({
                title: "Validation Error",
                description: "Value Flow percentages cannot be negative.",
                variant: "destructive"
            });
            return;
        }

        if (!isValidAllocation) {
            toast({
                title: "Validation Error",
                description: `Value flow allocations must sum to exactly 100% (currently ${totalPercentage}%).`,
                variant: "destructive"
            });
            return;
        }

        setSaving(true);
        try {
            const finalConfig: ProjectGovernanceConfig = {
                source,
                parentProjectId,
                parentProjectTitle,
                decisionModel,
                valueFlow: valueFlowBuckets,
                lastDecision,
                nextDecision,
                financialSnapshot
            };

            const res = await saveProjectGovernanceConfigAction(project.id, finalConfig);
            if (res.success) {
                toast({
                    title: "Success",
                    description: "Governance configuration saved successfully to Firestore."
                });
                setIsEditing(false);
                router.refresh();
            } else {
                toast({
                    title: "Save Failed",
                    description: res.error || "An unexpected error occurred.",
                    variant: "destructive"
                });
            }
        } catch (e: any) {
            toast({
                title: "Save Failed",
                description: e.message || "An unexpected network error occurred.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    // --- RENDER 1: Non-member Teaser Panel ---
    if (isNonMember) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <Card className="overflow-hidden border border-muted/50 bg-gradient-to-br from-card to-background shadow-lg">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                            <Shield className="h-6 w-6 animate-pulse" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            How this project is governed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <p className="text-muted-foreground leading-relaxed">
                            Open for Product projects can define how decisions are made, how value is distributed, and how contributors participate in project operations.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
                            <div className="p-4 rounded-lg bg-muted/40 border border-muted/40 space-y-1">
                                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-primary" /> Decision Making
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Configurable models ranging from Project Lead control to consensus votes.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/40 border border-muted/40 space-y-1">
                                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                                    <Check className="h-4 w-4 text-primary" /> Value Allocation
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Define transparent buckets dividing work earnings, community reserves, and long-term stake.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-muted/50 flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3.5 w-3.5" /> Join this project or sign in to view more governance details.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- RENDER 2: Full Dashboard (Members & Admins) ---
    return (
        <div className="space-y-6 pb-12">
            {/* Warning Banner for Malformed configurations */}
            {isMalformed && isLeadOrAdmin && (
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">Malformed Configuration</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        The saved project governance configuration was malformed or incomplete. The dashboard has fallen back to the default platform configuration. Saving changes will overwrite the corrupted configuration.
                    </AlertDescription>
                </Alert>
            )}

            {/* Action Bar for Leads/Admins */}
            {isLeadOrAdmin && (
                <div className="flex flex-wrap justify-between items-center gap-3 p-4 bg-muted/30 border rounded-lg">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Project Governance Controls</span>
                    </div>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleReset}
                                    className="flex items-center gap-1.5 text-xs"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 text-xs"
                                >
                                    <X className="h-3.5 w-3.5" /> Cancel
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={handleSave}
                                    disabled={saving || (!isValidAllocation && source === 'custom') || hasEmptyLabels || hasNegativeAllocation}
                                    className="flex items-center gap-1.5 text-xs"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Save Config
                                </Button>
                            </>
                        ) : (
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1.5 text-xs"
                            >
                                <Edit2 className="h-3.5 w-3.5" /> Edit Settings
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {(!renderSection || renderSection === 'governance') && (
                <>
                    {/* Header Summary Card */}
                    <Card className="relative overflow-hidden bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-black dark:to-slate-900 border-muted">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                Project Governance
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Operational rules, value distribution parameters, and decision logging.
                            </p>
                        </div>
                        <Badge 
                            variant="secondary" 
                            className={`px-3 py-1 text-xs font-semibold capitalize ${
                                source === 'custom' 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                            }`}
                        >
                            {source} {source === 'inherited' && `from ${parentProjectTitle}`}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2 border-t border-muted/50">
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Decision Model</span>
                        <span className="font-semibold text-sm block capitalize">
                            {decisionModel.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Value Flow Summary</span>
                        <span className="font-semibold text-sm block">
                            {valueFlowBuckets.map(b => b.percentage).join(' / ')}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">Last Decision</span>
                        <span className="font-semibold text-sm text-primary hover:underline cursor-pointer flex items-center gap-1">
                            {lastDecision.title || 'None'} <ArrowRight className="h-3 w-3" />
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Decision Making Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Decision Making
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Governance Source */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Governance Source</h4>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button 
                                        variant={source === 'inherited' ? 'secondary' : 'outline'}
                                        onClick={() => {
                                            setSource('inherited');
                                            if (parentOptions.length > 0 && parentProjectId === 'platform_default') {
                                                const defaultOption = parentOptions.find(o => o.type === 'project') || parentOptions[0];
                                                setParentProjectId(defaultOption.id);
                                                setParentProjectTitle(defaultOption.title);
                                            }
                                        }}
                                        className="justify-start sm:w-1/2"
                                    >
                                        <Check className={`mr-2 h-4 w-4 ${source === 'inherited' ? 'opacity-100' : 'opacity-0'}`} />
                                        Inherited from parent
                                    </Button>
                                    <Button 
                                        variant={source === 'custom' ? 'secondary' : 'outline'}
                                        onClick={() => setSource('custom')}
                                        className="justify-start sm:w-1/2"
                                    >
                                        <Check className={`mr-2 h-4 w-4 ${source === 'custom' ? 'opacity-100' : 'opacity-0'}`} />
                                        Custom governance
                                    </Button>
                                </div>

                                {/* Parent selection dropdown (visible when inherited is selected) */}
                                {source === 'inherited' && parentOptions.length > 0 && (
                                    <div className="space-y-2 p-3 bg-muted/20 border rounded-lg max-w-md">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                            Explicit Inheritance Target
                                        </label>
                                        <Select 
                                            value={parentProjectId}
                                            onValueChange={(val) => {
                                                const selected = parentOptions.find(o => o.id === val);
                                                if (selected) {
                                                    setParentProjectId(selected.id);
                                                    setParentProjectTitle(selected.title);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-full h-9 text-xs">
                                                <SelectValue placeholder="Select parent source" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {parentOptions.map(option => (
                                                    <SelectItem key={option.id} value={option.id} className="text-xs">
                                                        {option.title} ({option.type})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-muted/30 border border-muted rounded-md text-sm">
                                <span className="font-semibold text-muted-foreground mr-1.5">Active:</span>
                                {source === 'inherited' ? `Inherited from ${parentProjectTitle}` : 'Custom Governance'}
                            </div>
                        )}
                    </div>

                    {/* Decision Model */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Decision Model</h4>
                        {isEditing ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[
                                        { value: 'project_lead', label: 'Project Lead' },
                                        { value: 'project_lead_advisory', label: 'Project Lead + Advisory Review' },
                                        { value: 'majority_vote', label: 'Majority Vote' },
                                        { value: 'consensus', label: 'Consensus' },
                                        { value: 'parent_inherited', label: 'Parent Project Inherited' }
                                    ].map(model => (
                                        <Button
                                            key={model.value}
                                            variant={decisionModel === model.value ? 'secondary' : 'outline'}
                                            disabled={source === 'inherited'}
                                            onClick={() => setDecisionModel(model.value as DecisionModel)}
                                            className="justify-start text-xs h-10"
                                        >
                                            <Check className={`mr-2 h-3.5 w-3.5 ${decisionModel === model.value ? 'opacity-100' : 'opacity-0'}`} />
                                            {model.label}
                                        </Button>
                                    ))}
                                </div>
                                {source === 'inherited' && (
                                    <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" /> Inherited decision models cannot be changed. Switch Governance Source to Custom to edit.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-muted/30 border border-muted rounded-md text-sm capitalize">
                                {decisionModel.replace(/_/g, ' ')}
                            </div>
                        )}
                    </div>

                    {/* Decision Logs (Editable in edit mode) */}
                    <div className="pt-6 border-t border-muted/50 space-y-4">
                        <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-emerald-500" /> Cooperative Decisions (Project-Specific)
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Local decisions are scoped strictly to this project and are not affected by inheritance from parent projects or global platform defaults.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Most Recent Decision */}
                            <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-indigo-50/10 dark:bg-indigo-950/5 relative overflow-hidden">
                                <div className="absolute top-2 right-2">
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                                        Project Scope
                                    </Badge>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Most Recent Cooperative Decision</span>
                                {isEditing ? (
                                    <div className="space-y-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Title / Note</label>
                                            <Input 
                                                value={lastDecision.title} 
                                                onChange={(e) => setLastDecision(prev => ({ ...prev, title: e.target.value }))}
                                                className="h-8 text-xs"
                                                placeholder="Contributor agreement updated"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-muted-foreground">Status</label>
                                                <Select 
                                                    value={lastDecision.status} 
                                                    onValueChange={(val: any) => setLastDecision(prev => ({ ...prev, status: val }))}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['draft', 'scheduled', 'approved', 'rejected', 'completed'].map(st => (
                                                            <SelectItem key={st} value={st} className="text-xs capitalize">{st}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-muted-foreground">Date (or Today)</label>
                                                <Input 
                                                    value={lastDecision.date} 
                                                    onChange={(e) => setLastDecision(prev => ({ ...prev, date: e.target.value }))}
                                                    className="h-8 text-xs"
                                                    placeholder="e.g. 2026-06-28"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h5 className="font-semibold text-sm pr-16">{lastDecision.title || 'No recent decisions'}</h5>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 capitalize hover:bg-green-100">
                                                {lastDecision.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{lastDecision.date || 'TBD'}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Next Decision */}
                            <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-indigo-50/10 dark:bg-indigo-950/5 relative overflow-hidden">
                                <div className="absolute top-2 right-2">
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900">
                                        Project Scope
                                    </Badge>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Next Cooperative Decision</span>
                                {isEditing ? (
                                    <div className="space-y-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-muted-foreground">Title / Note</label>
                                            <Input 
                                                value={nextDecision.title} 
                                                onChange={(e) => setNextDecision(prev => ({ ...prev, title: e.target.value }))}
                                                className="h-8 text-xs"
                                                placeholder="Governance review"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-muted-foreground">Status</label>
                                                <Select 
                                                    value={nextDecision.status} 
                                                    onValueChange={(val: any) => setNextDecision(prev => ({ ...prev, status: val }))}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['draft', 'scheduled', 'approved', 'rejected', 'completed'].map(st => (
                                                            <SelectItem key={st} value={st} className="text-xs capitalize">{st}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-muted-foreground">Date (or TBD)</label>
                                                <Input 
                                                    value={nextDecision.date} 
                                                    onChange={(e) => setNextDecision(prev => ({ ...prev, date: e.target.value }))}
                                                    className="h-8 text-xs"
                                                    placeholder="e.g. July 15, 2026"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h5 className="font-semibold text-sm pr-16">{nextDecision.title || 'No upcoming decisions scheduled'}</h5>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 capitalize hover:bg-blue-100">
                                                {nextDecision.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">Expected: {nextDecision.date || 'TBD'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coming Soon Muted Area */}
                    <div className="p-4 bg-muted/20 border border-dashed rounded-lg">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Coming soon</span>
                        <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground list-disc pl-4">
                            <li>Active proposals</li>
                            <li>Voting eligibility</li>
                            <li>Quorum rules</li>
                            <li>Decision history</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Value Flow Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">Value Flow</CardTitle>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Source: <Badge variant="outline" className="capitalize">{source} value flow</Badge>
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        This section describes how project revenue or funded value is allocated across operational and sustainability categories.
                    </p>

                    {/* Extensible Buckets */}
                    <div className="space-y-6">
                        {valueFlowBuckets.map((bucket) => {
                            const isDefaultBucket = ['contributors', 'commons', 'long_term_stake'].includes(bucket.id);
                            return (
                                <div key={bucket.id} className="space-y-2 p-4 rounded-lg bg-slate-50/40 dark:bg-slate-950/40 border border-muted/50">
                                    <div className="flex justify-between items-center">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-1 mr-4">
                                                <Input 
                                                    value={bucket.label} 
                                                    onChange={(e) => handleLabelChange(bucket.id, e.target.value)}
                                                    disabled={source === 'inherited'}
                                                    className="h-8 font-semibold text-sm max-w-[240px] px-2 py-1"
                                                    placeholder="Bucket Name"
                                                />
                                                {!isDefaultBucket && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        disabled={source === 'inherited'}
                                                        onClick={() => handleRemoveBucket(bucket.id)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <h5 className="font-semibold text-sm">{bucket.label}</h5>
                                        )}
                                        <Badge variant="outline" className="text-sm font-semibold px-2 py-0.5">
                                            {bucket.percentage}%
                                        </Badge>
                                    </div>

                                    {bucket.description && (
                                        <p className="text-xs text-muted-foreground italic mb-3">
                                            {bucket.description}
                                        </p>
                                    )}

                                    {/* Sliders for Edit mode, Progress Bars for View mode */}
                                    {isEditing ? (
                                        <div className="pt-2 flex items-center gap-4">
                                            <Slider 
                                                value={[bucket.percentage]}
                                                onValueChange={(val) => handleSliderChange(bucket.id, val)}
                                                min={0}
                                                max={100}
                                                step={1}
                                                disabled={source === 'inherited'}
                                                className="flex-1"
                                            />
                                        </div>
                                    ) : (
                                        <Progress value={bucket.percentage} className="h-2 w-full mt-2" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Custom Bucket and Save controls for Leads */}
                    {isEditing && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-muted/50">
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleAddBucket}
                                    disabled={source === 'inherited'}
                                    className="flex items-center gap-1.5 w-full sm:w-auto"
                                >
                                    <Plus className="h-4 w-4" /> Add Custom Bucket
                                </Button>
                                {source === 'inherited' && (
                                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1 mt-1">
                                        <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground" /> Inherited value flows cannot be changed. Switch Governance Source to Custom to edit.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                    {source === 'inherited' ? (
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <Check className="h-4 w-4" /> Inheriting Parent Allocations
                                        </span>
                                    ) : isValidAllocation ? (
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <Check className="h-4 w-4" /> Total Allocations: 100%
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" /> Total: {totalPercentage}% (Must be 100%)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            </>
            )}

            {(!renderSection || renderSection === 'fundry') && (
                <>
            {/* Financial Snapshot Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Financial Snapshot
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { field: 'creditOnHand' as const, label: 'Credit on hand', value: financialSnapshot.creditOnHand },
                            { field: 'neededForNextTasks' as const, label: 'Needed for next up tasks', value: financialSnapshot.neededForNextTasks },
                            { field: 'alreadyDedicated' as const, label: 'Already dedicated', value: financialSnapshot.alreadyDedicated },
                            { field: 'remainingNeed' as const, label: 'Remaining need', value: financialSnapshot.remainingNeed }
                        ].map(snap => (
                            <div key={snap.field} className="p-4 rounded-lg border bg-slate-50/20 dark:bg-slate-900/20 flex flex-col justify-between">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">{snap.label}</span>
                                {isEditing ? (
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            value={snap.value}
                                            onChange={(e) => handleSnapshotFieldChange(snap.field, e.target.value)}
                                            className="h-8 text-xs pl-6"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xl font-bold">${snap.value.toLocaleString()}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Fundry integration will connect task-level funding thresholds, credit balances, and allocation status.
                    </p>
                </CardContent>
            </Card>

            {/* --- FUNDRY MVP SECTION --- */}
            <div className="border-t pt-8 mt-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" /> Fundry Funding Portal
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Coordinate and direct project resources toward next up goals.
                        </p>
                    </div>
                    <div>
                        {isLeadOrAdmin && (
                            <Button
                                variant={fundryConfig?.enabled ? "outline" : "default"}
                                size="sm"
                                disabled={togglingFundry}
                                onClick={() => handleToggleFundry(!fundryConfig?.enabled)}
                                className="text-xs flex items-center gap-1.5"
                            >
                                {togglingFundry ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : fundryConfig?.enabled ? (
                                    <>Disable Fundry</>
                                ) : (
                                    <>
                                        <Plus className="h-3.5 w-3.5" /> Enable Fundry
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Case A: Fundry is Disabled */}
                {!fundryConfig?.enabled ? (
                    <Card className="border border-dashed border-muted bg-slate-50/20 dark:bg-slate-900/10">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    Fundry Coordination Model
                                </CardTitle>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                                    Not Enabled
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Fundry helps project members direct resources toward the work that moves the project forward. Members allocate signaling credits, while project leads track real or pledged pool values to evaluate task fundability.
                            </p>
                            <div className="p-3 bg-muted/20 rounded-md text-xs">
                                {isLeadOrAdmin ? (
                                    <span className="font-medium text-primary">As a project lead, you can enable Fundry above to set up funding goals and pool contributions.</span>
                                ) : (
                                    <span className="text-muted-foreground">This project has not enabled Fundry yet. Ask the administrator/project lead to turn it on!</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    // Case B: Fundry is Enabled
                    <div className="space-y-6">
                        {/* Square Payments Connected Banner */}
                        <Alert className="bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/10 dark:border-indigo-900">
                            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <AlertTitle className="text-indigo-800 dark:text-indigo-200 font-semibold flex items-center gap-1.5">
                                Square Payments Connected
                            </AlertTitle>
                            <AlertDescription className="text-indigo-700 dark:text-indigo-300 text-xs space-y-1">
                                <p>Secure card payments are enabled. Back this project to dynamically allocate credit weightings. Manual tracks are preserved for offline/lead transactions.</p>
                                <p className="font-semibold mt-1">Status: Live card processing active via Square Checkout</p>
                            </AlertDescription>
                        </Alert>

                        {/* Pool Snapshot Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        Funding Pool Snapshot
                                    </CardTitle>
                                    <div className="flex gap-2 flex-wrap">
                                        {currentUser && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setSquareAmount(25);
                                                    setSquareName(currentUser.name || '');
                                                    setSquareEmail(currentUser.email || '');
                                                    setSquareGoalId('pool_general');
                                                    setIsSquareModalOpen(true);
                                                }}
                                                className="text-xs h-8 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Back Project
                                            </Button>
                                        )}
                                        {isLeadOrAdmin && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsContribModalOpen(true)}
                                                    className="text-xs h-8"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Manual Track
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGoalModalOpen()}
                                                    className="text-xs h-8"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Goal
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 border rounded-lg bg-slate-50/30 dark:bg-slate-900/10">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Confirmed Pool</span>
                                        <span className="text-xl font-bold block mt-1 text-emerald-600 dark:text-emerald-400">${activePoolValue.toLocaleString()}</span>
                                        <span className="text-[10px] text-muted-foreground">Active display pool value</span>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-slate-50/30 dark:bg-slate-900/10">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pledged / Pending</span>
                                        <span className="text-xl font-bold block mt-1">${(fundryConfig.pool.pendingCollectionAmount + fundryConfig.pool.pledgedAmount).toLocaleString()}</span>
                                        <span className="text-[10px] text-muted-foreground">Expected contributions</span>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-slate-50/30 dark:bg-slate-900/10">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Placeholder Estimate</span>
                                        <span className="text-xl font-bold block mt-1">${fundryConfig.pool.placeholderAmount.toLocaleString()}</span>
                                        <span className="text-[10px] text-muted-foreground">Demo/planning estimate</span>
                                    </div>
                                    <div className="p-3 border rounded-lg bg-slate-50/30 dark:bg-slate-900/10">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Credit Value</span>
                                        <span className="text-xl font-bold block mt-1 text-primary">${currentCreditValue.toFixed(2)}</span>
                                        <span className="text-[10px] text-muted-foreground">Valuation per active credit</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-muted/20 border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                                    <div>
                                        <span className="font-semibold block text-foreground">Active Signal Volume:</span>
                                        {totalActiveCredits} credits are currently allocated across all goals.
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-foreground">Pool Valuation Scope:</span>
                                        Display Mode is set to <Badge variant="outline" className="capitalize text-[10px] px-1 py-0">{fundryConfig.valuation.displayMode.replace(/_/g, ' ')}</Badge>.
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Funding Goals and Allocations Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Goals List (Left 2 Columns) */}
                            <div className="lg:col-span-2 space-y-4">
                                <h4 className="font-bold text-base flex items-center gap-1.5">
                                    <Target className="h-4 w-4 text-primary" /> Active Funding Goals ({hydratedGoals.length})
                                </h4>

                                {hydratedGoals.length === 0 ? (
                                    <div className="text-center py-12 border rounded-xl border-dashed text-muted-foreground text-sm">
                                        No active funding goals configured yet.
                                        {isLeadOrAdmin && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleGoalModalOpen()}
                                                className="mt-3 block mx-auto text-xs"
                                            >
                                                Create First Goal
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {hydratedGoals.map(goal => {
                                            const progressPercent = goal.targetAmount > 0 ? Math.min(100, (goal.totalProgressValue / goal.targetAmount) * 100) : 0;
                                            const minStartPercent = goal.targetAmount > 0 ? Math.min(100, (goal.minimumStartAmount / goal.targetAmount) * 100) : 0;

                                            // Category labels mapping
                                            const categoryLabels: Record<string, string> = {
                                                tools: "Tools & Infrastructure",
                                                labor: "Labor & Development",
                                                marketing: "Marketing & Outreach",
                                                research: "Research & Design",
                                                operations: "Operations",
                                                legal: "Legal & Compliance",
                                                community: "Community & Events",
                                                other: "Other"
                                            };

                                            const priorityClasses: Record<string, string> = {
                                                critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
                                                high: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                                                medium: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
                                                low: "bg-muted text-muted-foreground"
                                            };

                                            const statusLabels: Record<string, string> = {
                                                unfunded: "Unfunded",
                                                partially_directed: "Partially Directed",
                                                directed_pending_lock: "Directed, Pending Lock",
                                                funded_pending_collection: "Funded, Pending Collection",
                                                funded: "Confirmed Funded",
                                                overfunded: "Overfunded",
                                                in_progress: "In Progress",
                                                completed: "Completed"
                                            };

                                            return (
                                                <Card key={goal.id} className="overflow-hidden border border-muted hover:border-primary/30 transition-all shadow-sm">
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                                                        {categoryLabels[goal.category] || goal.category}
                                                                    </Badge>
                                                                    <Badge className={`text-[10px] px-1.5 py-0 capitalize ${priorityClasses[goal.priority]}`}>
                                                                        {goal.priority}
                                                                    </Badge>
                                                                    <Badge className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100 capitalize">
                                                                        {statusLabels[goal.fundingStatus] || goal.fundingStatus}
                                                                    </Badge>
                                                                </div>
                                                                <h5 className="font-bold text-base text-foreground leading-snug mt-1.5">{goal.title}</h5>
                                                                {goal.description && <p className="text-xs text-muted-foreground leading-relaxed mt-1">{goal.description}</p>}
                                                            </div>

                                                            {isLeadOrAdmin && (
                                                                <div className="flex gap-1.5 shrink-0">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleGoalModalOpen(goal)}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDeleteGoal(goal.id)}
                                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Visual Progress Bar */}
                                                        <div className="space-y-1 pt-1.5">
                                                            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                                                <span>Progress: ${Math.round(goal.totalProgressValue).toLocaleString()}</span>
                                                                <span>Target: ${goal.targetAmount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="relative w-full h-3 bg-muted rounded-full overflow-visible">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                        goal.isFunded 
                                                                            ? 'bg-emerald-500' 
                                                                            : goal.totalProgressValue >= goal.minimumStartAmount 
                                                                                ? 'bg-blue-400' 
                                                                                : 'bg-indigo-400'
                                                                    }`}
                                                                    style={{ width: `${progressPercent}%` }}
                                                                />
                                                                {/* Minimum start marker */}
                                                                {goal.targetAmount > 0 && (
                                                                    <div 
                                                                        className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                                                                        style={{ left: `${minStartPercent}%` }}
                                                                        title={`Minimum start threshold: $${goal.minimumStartAmount}`}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between text-[9px] text-muted-foreground">
                                                                <span className="text-rose-500 font-semibold">| Min to Start: ${goal.minimumStartAmount.toLocaleString()}</span>
                                                                <span>{Math.round(progressPercent)}% funded</span>
                                                            </div>
                                                        </div>

                                                        {/* Snapshot value breakdowns */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] border-t border-muted/50 text-muted-foreground">
                                                            <div>
                                                                <span className="font-semibold block text-foreground">Currently Directed:</span>
                                                                ${Math.round(goal.directedValue).toLocaleString()}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold block text-foreground">Locked Balance:</span>
                                                                ${Math.round(goal.lockedValue).toLocaleString()}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold block text-foreground">Confirmed Cash:</span>
                                                                ${Math.round(goal.confirmedValue).toLocaleString()}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold block text-foreground">Pledged/Pending:</span>
                                                                ${Math.round(goal.pendingValue + goal.pledgedValue + goal.placeholderValue).toLocaleString()}
                                                            </div>
                                                        </div>

                                                        {/* Reallocation Notice */}
                                                        {goal.totalProgressValue >= goal.minimumStartAmount && myAllocations[goal.id] > 0 && (
                                                            <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded-md text-[10px] text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                                                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                                                <span>This goal has enough directed value to start. You can keep your allocation here or redirect some credits before they lock.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Member Allocations Control Panel (Right 1 Column) */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-base flex items-center gap-1.5">
                                    <Sliders className="h-4 w-4 text-primary" /> Credit Allocations
                                </h4>

                                {isNonMember ? (
                                    <Card className="p-4 text-center border-dashed text-xs text-muted-foreground">
                                        <Lock className="h-4 w-4 mx-auto mb-2 text-muted-foreground" />
                                        Please join this project to allocate credit signals.
                                    </Card>
                                ) : (
                                    <Card className="p-4 space-y-4 border border-muted shadow-sm">
                                        <div className="space-y-1">
                                            <h5 className="font-semibold text-sm">Signal credit limits</h5>
                                            <p className="text-xs text-muted-foreground">
                                                Credits are allocation signals, not currency. Their estimated value changes as the project funding pool changes. Once an allocation locks, its value is fixed.
                                            </p>
                                        </div>

                                        {/* Credits tracking numbers */}
                                        <div className="grid grid-cols-3 gap-2 border p-2 bg-muted/20 rounded-md text-center text-xs">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Available</span>
                                                <span className="font-bold text-foreground">{hydratedGoals.length === 1 ? 0 : remainingAvailableCredits}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Allocated</span>
                                                <span className="font-bold text-primary">{hydratedGoals.length === 1 ? 100 : myTotalCreditsAllocated}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Locked</span>
                                                <span className="font-bold text-muted-foreground">{lockedCreditsUsed}</span>
                                            </div>
                                        </div>

                                        {/* Slider selectors for each goal */}
                                        {hydratedGoals.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-4">No active goals to allocate to.</p>
                                        ) : (
                                            <div className="space-y-4 pt-2">
                                                {hydratedGoals.map(goal => {
                                                    const isSingleGoal = hydratedGoals.length === 1;
                                                    const credits = isSingleGoal ? 100 : (myAllocations[goal.id] || 0);
                                                    const usdVal = credits * currentCreditValue;

                                                    // Calculate my direct contribution to this goal
                                                    const myGoalContribution = (fundingContributions || []).filter(c => 
                                                        c.goalId === goal.id && 
                                                        c.contributorId === currentUser?.id &&
                                                        c.status === 'confirmed'
                                                    ).reduce((sum, c) => sum + c.amount, 0);

                                                    return (
                                                        <div key={goal.id} className="space-y-1 pb-3 border-b last:border-b-0 last:pb-0">
                                                            {myGoalContribution > 0 && (
                                                                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mb-1">
                                                                    Your contribution:
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold truncate max-w-[140px]" title={goal.title}>{goal.title}</span>
                                                                <Badge variant="secondary" className="text-[10px] font-bold">
                                                                    {credits} credits (+ ${Math.round(usdVal)})
                                                                </Badge>
                                                            </div>
                                                            <div className="pt-1.5 flex items-center gap-3">
                                                                {myGoalContribution > 0 && (
                                                                    <span className="text-xs font-bold text-emerald-600">${myGoalContribution}</span>
                                                                )}
                                                                <Slider 
                                                                    value={[credits]}
                                                                    onValueChange={(val) => handleCreditChange(goal.id, val[0])}
                                                                    min={0}
                                                                    max={isSingleGoal ? 100 : credits + remainingAvailableCredits}
                                                                    step={1}
                                                                    className="flex-1"
                                                                    disabled={isSingleGoal}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {hydratedGoals.length > 1 && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={savingAllocations || myTotalCreditsAllocated === 0}
                                                        onClick={handleSaveAllocations}
                                                        className="w-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5"
                                                    >
                                                        {savingAllocations ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                        Save Allocation Signals
                                                    </Button>
                                                )}

                                                <p className="text-[9px] text-muted-foreground text-center italic mt-2">
                                                    Rolling Lock: Allocations remain editable for 7 days, after which they lock in value.
                                                </p>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL DIALOGS --- */}

            {/* 1. Create/Edit Funding Goal Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-background border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-lg font-bold">
                                {editingGoal ? "Edit Funding Goal" : "Create Funding Goal"}
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsGoalModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="space-y-1">
                                <Label className="font-semibold">Goal Title</Label>
                                <Input 
                                    value={goalTitle} 
                                    onChange={(e) => setGoalTitle(e.target.value)} 
                                    placeholder="e.g. Server hosting renewal"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Description</Label>
                                <Input 
                                    value={goalDescription} 
                                    onChange={(e) => setGoalDescription(e.target.value)} 
                                    placeholder="What does this goal cover?"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-semibold">Category</Label>
                                    <Select value={goalCategory} onValueChange={(val: any) => setGoalCategory(val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tools">Tools & Infrastructure</SelectItem>
                                            <SelectItem value="labor">Labor & Development</SelectItem>
                                            <SelectItem value="marketing">Marketing & Outreach</SelectItem>
                                            <SelectItem value="research">Research & Design</SelectItem>
                                            <SelectItem value="operations">Operations</SelectItem>
                                            <SelectItem value="legal">Legal & Compliance</SelectItem>
                                            <SelectItem value="community">Community & Events</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="font-semibold">Priority</Label>
                                    <Select value={goalPriority} onValueChange={(val: any) => setGoalPriority(val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-semibold">Minimum to Start ($)</Label>
                                    <Input 
                                        type="number" 
                                        value={goalMinStart} 
                                        onChange={(e) => setGoalMinStart(parseFloat(e.target.value) || 0)} 
                                    />
                                    <span className="text-[10px] text-muted-foreground block">Minimum needed to start work</span>
                                </div>

                                <div className="space-y-1">
                                    <Label className="font-semibold">Target Amount ($)</Label>
                                    <Input 
                                        type="number" 
                                        value={goalTarget} 
                                        onChange={(e) => setGoalTarget(parseFloat(e.target.value) || 0)} 
                                    />
                                    <span className="text-[10px] text-muted-foreground block">Target for full funding</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Visibility</Label>
                                <Select value={goalVisibility} onValueChange={(val: any) => setGoalVisibility(val)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">Public (Everyone)</SelectItem>
                                        <SelectItem value="members">Members Only</SelectItem>
                                        <SelectItem value="leads">Project Leads Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Notes / Notes for leads</Label>
                                <Input 
                                    value={goalNotes} 
                                    onChange={(e) => setGoalNotes(e.target.value)} 
                                    placeholder="External references, links, or developer assignments"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-3">
                            <Button variant="ghost" onClick={() => setIsGoalModalOpen(false)} disabled={savingGoal}>
                                Cancel
                            </Button>
                            <Button variant="default" onClick={handleSaveGoal} disabled={savingGoal}>
                                {savingGoal ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                Save Goal
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Add Contribution Modal */}
            {isContribModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-background border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-lg font-bold">Add Contribution</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsContribModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="space-y-1">
                                <Label className="font-semibold">Contributor Name</Label>
                                <Input 
                                    value={contribName} 
                                    onChange={(e) => setContribName(e.target.value)} 
                                    placeholder="Anonymous / Lead / User Name"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Amount ($ USD)</Label>
                                <Input 
                                    type="number" 
                                    value={contribAmount} 
                                    onChange={(e) => setContribAmount(parseFloat(e.target.value) || 0)} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-semibold">Type</Label>
                                    <Select value={contribType} onValueChange={(val: any) => {
                                        setContribType(val);
                                        // Auto-sync status
                                        if (val === 'placeholder') setContribStatus('placeholder');
                                        else if (val === 'pledge') setContribStatus('pledged');
                                        else if (val === 'pending_collection') setContribStatus('pending_collection');
                                        else if (val === 'manual') setContribStatus('confirmed');
                                    }}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="placeholder">Placeholder (Estimate)</SelectItem>
                                            <SelectItem value="pledge">Pledge (Expected)</SelectItem>
                                            <SelectItem value="pending_collection">Pending Collection</SelectItem>
                                            <SelectItem value="manual">Manual Confirm (Cash)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="font-semibold">Status</Label>
                                    <Select value={contribStatus} onValueChange={(val: any) => setContribStatus(val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="placeholder">Placeholder</SelectItem>
                                            <SelectItem value="pledged">Pledged</SelectItem>
                                            <SelectItem value="pending_collection">Pending Collection</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Goal Assignment Dropdown */}
                            <div className="space-y-1">
                                <Label className="font-semibold">Direct Assignment (Optional)</Label>
                                <Select value={contribGoalId} onValueChange={(val: any) => setContribGoalId(val)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pool_general">General Pool (Shared signals value)</SelectItem>
                                        {hydratedGoals.map(g => (
                                            <SelectItem key={g.id} value={g.id}>Goal: {g.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-[10px] text-muted-foreground block">Assign directly to a goal, or leave in the general pool to support floating allocation credits.</span>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Notes</Label>
                                <Input 
                                    value={contribNote} 
                                    onChange={(e) => setContribNote(e.target.value)} 
                                    placeholder="Audit notes or transaction references"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-3">
                            <Button variant="ghost" onClick={() => setIsContribModalOpen(false)} disabled={savingContrib}>
                                Cancel
                            </Button>
                            <Button variant="default" onClick={handleSaveContribution} disabled={savingContrib}>
                                {savingContrib ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                Add Contribution
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Square Checkout Modal */}
            {isSquareModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-background border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-indigo-600" />
                                Back Project (Secure Card Checkout)
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsSquareModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="space-y-1">
                                <Label className="font-semibold">Contributor Name</Label>
                                <Input 
                                    value={squareName} 
                                    onChange={(e) => setSquareName(e.target.value)} 
                                    placeholder="Your Name (visible in ledger)"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Contributor Email</Label>
                                <Input 
                                    type="email"
                                    value={squareEmail} 
                                    onChange={(e) => setSquareEmail(e.target.value)} 
                                    placeholder="your@email.com (private receipt tracking)"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Contribution Amount ($ USD)</Label>
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={squareAmount} 
                                    onChange={(e) => setSquareAmount(parseFloat(e.target.value) || 0)} 
                                    placeholder="25"
                                />
                                <span className="text-[10px] text-muted-foreground block">
                                    Minimum contribution amount is $1.00 USD.
                                </span>
                            </div>

                            <div className="space-y-1">
                                <Label className="font-semibold">Direct Signal Assignment (Optional)</Label>
                                <Select value={squareGoalId} onValueChange={(val: any) => setSquareGoalId(val)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pool_general">General Pool (Signal shared projects value)</SelectItem>
                                        {hydratedGoals.map(g => (
                                            <SelectItem key={g.id} value={g.id}>Goal: {g.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/10 rounded-md border border-dashed text-xs text-muted-foreground space-y-1.5">
                                <p>🔒 **Secure processing via Square Checkout**.</p>
                                <p>We do not store your credit card details locally. Square handles transaction processing securely on their hosted checkout servers.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-3">
                            <Button variant="ghost" onClick={() => setIsSquareModalOpen(false)} disabled={isCreatingCheckout}>
                                Cancel
                            </Button>
                            <Button 
                                variant="default" 
                                onClick={handleSquareCheckout} 
                                disabled={isCreatingCheckout}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                            >
                                {isCreatingCheckout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Pay with Card
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Return Overlay */}
            {isVerifyingOverlayOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-background border rounded-xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
                        {verificationState === 'loading' && (
                            <div className="space-y-3 py-4">
                                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                                <h4 className="font-bold text-base text-foreground">Confirming contribution...</h4>
                                <p className="text-xs text-muted-foreground">Checking payment transaction status with Square...</p>
                            </div>
                        )}
                        {verificationState === 'confirmed' && (
                            <div className="space-y-3 py-2">
                                <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                                    <Check className="h-6 w-6" />
                                </div>
                                <h4 className="font-bold text-base text-emerald-700 dark:text-emerald-400">Contribution Confirmed!</h4>
                                <p className="text-xs text-muted-foreground">Thank you for backing this project. Your credits allocation signals are now active in the pool.</p>
                                <Button size="sm" className="w-full mt-2" onClick={() => setIsVerifyingOverlayOpen(false)}>
                                    Done
                                </Button>
                            </div>
                        )}
                        {verificationState === 'pending' && (
                            <div className="space-y-3 py-2">
                                <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <h4 className="font-bold text-base text-amber-700 dark:text-amber-400">Processing Payment...</h4>
                                <p className="text-xs text-muted-foreground">We've recorded your contribution, and we're processing it with our payment provider. Your pool credits will update shortly once confirmed.</p>
                                <Button size="sm" className="w-full mt-2" onClick={() => setIsVerifyingOverlayOpen(false)}>
                                    OK
                                </Button>
                            </div>
                        )}
                        {verificationState === 'failed' && (
                            <div className="space-y-3 py-2">
                                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto">
                                    <X className="h-6 w-6" />
                                </div>
                                <h4 className="font-bold text-base text-destructive">Transaction Unsuccessful</h4>
                                <p className="text-xs text-muted-foreground">The transaction was cancelled or could not be completed by Square. Please try again.</p>
                                <Button size="sm" className="w-full mt-2" onClick={() => setIsVerifyingOverlayOpen(false)}>
                                    Close
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
}
