'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { HydratedProject, User, ProjectGovernanceConfig, ValueFlowBucket, DecisionModel, GovernanceSource } from '@/lib/types';
import { Shield, Sparkles, Check, AlertCircle, Plus, Trash2, ArrowRight, Lock } from 'lucide-react';

interface ProjectGovernanceProps {
    project: HydratedProject;
    currentUser: User | null;
    isLead: boolean;
}

const defaultGovernanceConfig: ProjectGovernanceConfig = {
    source: "inherited",
    parentProjectTitle: "Open for Product",
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
};

export default function ProjectGovernance({ project, currentUser, isLead }: ProjectGovernanceProps) {
    const { toast } = useToast();

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

    // 2. Local state for configuration adjustments (mock persistence)
    const config = useMemo(() => {
        return project.governanceConfig || defaultGovernanceConfig;
    }, [project.governanceConfig]);

    const [source, setSource] = useState<GovernanceSource>(config.source);
    const [decisionModel, setDecisionModel] = useState<DecisionModel>(config.decisionModel);
    const [valueFlowBuckets, setValueFlowBuckets] = useState<ValueFlowBucket[]>(config.valueFlow);

    // Sum calculation for real-time validation
    const totalPercentage = useMemo(() => {
        return valueFlowBuckets.reduce((acc, curr) => acc + curr.percentage, 0);
    }, [valueFlowBuckets]);

    const isValidAllocation = totalPercentage === 100;

    // Handlers
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

    const handleSave = () => {
        if (!isValidAllocation) {
            toast({
                title: "Invalid Allocation",
                description: `Value flow allocations must sum to exactly 100% (currently ${totalPercentage}%).`,
                variant: "destructive"
            });
            return;
        }
        toast({
            title: "Governance Settings",
            description: "Governance configuration override saved locally. Persistent database saves are coming soon!",
        });
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
                            {source} {source === 'inherited' && `from ${config.parentProjectTitle || 'Parent'}`}
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
                            {config.lastDecision?.title || 'None'} <ArrowRight className="h-3 w-3" />
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
                        {isLeadOrAdmin ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button 
                                    variant={source === 'inherited' ? 'secondary' : 'outline'}
                                    onClick={() => setSource('inherited')}
                                    className="justify-start sm:w-1/2"
                                >
                                    <Check className={`mr-2 h-4 w-4 ${source === 'inherited' ? 'opacity-100' : 'opacity-0'}`} />
                                    Inherited from {config.parentProjectTitle || 'Parent'}
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
                        ) : (
                            <div className="p-3 bg-muted/30 border border-muted rounded-md text-sm">
                                <span className="font-medium">Active:</span> {source === 'inherited' ? `Inherited from ${config.parentProjectTitle}` : 'Custom Governance'}
                            </div>
                        )}
                    </div>

                    {/* Decision Model */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Decision Model</h4>
                        {isLeadOrAdmin ? (
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
                                        onClick={() => setDecisionModel(model.value as DecisionModel)}
                                        className="justify-start text-xs h-10"
                                    >
                                        <Check className={`mr-2 h-3.5 w-3.5 ${decisionModel === model.value ? 'opacity-100' : 'opacity-0'}`} />
                                        {model.label}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 bg-muted/30 border border-muted rounded-md text-sm capitalize">
                                {decisionModel.replace(/_/g, ' ')}
                            </div>
                        )}
                    </div>

                    {/* Decision Logs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-muted/50">
                        {/* Most Recent Decision */}
                        {config.lastDecision && (
                            <div className="space-y-1.5 p-3 rounded-lg border border-muted/70 bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Most Recent Cooperative Decision</span>
                                <h5 className="font-semibold text-sm">{config.lastDecision.title}</h5>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 capitalize hover:bg-green-100">
                                        {config.lastDecision.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{config.lastDecision.date}</span>
                                </div>
                            </div>
                        )}

                        {/* Next Decision */}
                        {config.nextDecision && (
                            <div className="space-y-1.5 p-3 rounded-lg border border-muted/70 bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Next Cooperative Decision</span>
                                <h5 className="font-semibold text-sm">{config.nextDecision.title}</h5>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 capitalize hover:bg-blue-100">
                                        {config.nextDecision.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">Expected: {config.nextDecision.date}</span>
                                </div>
                            </div>
                        )}
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
                                        {isLeadOrAdmin ? (
                                            <div className="flex items-center gap-2 flex-1 mr-4">
                                                <Input 
                                                    value={bucket.label} 
                                                    onChange={(e) => handleLabelChange(bucket.id, e.target.value)}
                                                    className="h-8 font-semibold text-sm max-w-[240px] px-2 py-1"
                                                    placeholder="Bucket Name"
                                                />
                                                {!isDefaultBucket && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleRemoveBucket(bucket.id)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
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

                                    {/* Sliders for Leads/Admins, Progress Bars for Members */}
                                    {isLeadOrAdmin ? (
                                        <div className="pt-2 flex items-center gap-4">
                                            <Slider 
                                                value={[bucket.percentage]}
                                                onValueChange={(val) => handleSliderChange(bucket.id, val)}
                                                min={0}
                                                max={100}
                                                step={1}
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
                    {isLeadOrAdmin && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-muted/50">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleAddBucket}
                                className="flex items-center gap-1.5 w-full sm:w-auto"
                            >
                                <Plus className="h-4 w-4" /> Add Custom Bucket
                            </Button>

                            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                    {isValidAllocation ? (
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <Check className="h-4 w-4" /> Total Allocations: 100%
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" /> Total: {totalPercentage}% (Must be 100%)
                                        </span>
                                    )}
                                </div>

                                <Button 
                                    onClick={handleSave} 
                                    disabled={!isValidAllocation}
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    Save Config
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Override setting disclaimer */}
                    {isLeadOrAdmin && (
                        <p className="text-xs text-muted-foreground text-center sm:text-right italic">
                            Override settings coming soon
                        </p>
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
                        <div className="p-4 rounded-lg border bg-slate-50/20 dark:bg-slate-900/20">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Credit on hand</span>
                            <span className="text-xl font-bold">$0</span>
                        </div>
                        <div className="p-4 rounded-lg border bg-slate-50/20 dark:bg-slate-900/20">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Needed for next up tasks</span>
                            <span className="text-xl font-bold">$0</span>
                        </div>
                        <div className="p-4 rounded-lg border bg-slate-50/20 dark:bg-slate-900/20">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Already dedicated</span>
                            <span className="text-xl font-bold">$0</span>
                        </div>
                        <div className="p-4 rounded-lg border bg-slate-50/20 dark:bg-slate-900/20">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Remaining need</span>
                            <span className="text-xl font-bold">$0</span>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                        Fundry integration will connect task-level funding thresholds, credit balances, and allocation status.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
