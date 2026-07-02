'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveProjectGovernanceConfigAction } from '@/app/actions/projects';
import type { HydratedProject, User, ProjectGovernanceConfig, ValueFlowBucket, DecisionModel, GovernanceSource, CooperativeDecision, FinancialSnapshot } from '@/lib/types';
import { Shield, Sparkles, Check, AlertCircle, Plus, Trash2, ArrowRight, Lock, Edit2, RotateCcw, X, Loader2 } from 'lucide-react';

interface ProjectGovernanceProps {
    project: HydratedProject;
    currentUser: User | null;
    isLead: boolean;
    parentOptions?: Array<{ id: string; title: string; type: 'project' | 'collection' | 'platform' }>;
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

export default function ProjectGovernance({ project, currentUser, isLead, parentOptions = [] }: ProjectGovernanceProps) {
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
        </div>
    );
}
