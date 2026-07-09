'use client';

import { useState, useEffect } from 'react';
import { PlatformConfig, User, DecisionModel, ValueFlowBucket, FinancialSnapshot } from '@/lib/types';
import { updatePlatformConfigAction, getAllUsersForAdminAction, setUserAdminStatusAction } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import SquareWebhookLogs from './square-webhook-logs';

export default function AdminClientPage({ initialConfig, currentUserId }: { initialConfig: PlatformConfig, currentUserId: string }) {
    const [config, setConfig] = useState<PlatformConfig>(() => {
        const copy = { ...initialConfig };
        if (!copy.defaultGovernance) {
            copy.defaultGovernance = {
                decisionModel: 'project_lead_advisory',
                valueFlow: [
                    { id: 'contributors', label: 'Contributors', percentage: 75, description: 'Value distributed to people doing project work.' },
                    { id: 'commons', label: 'Community Commons', percentage: 15, description: 'Shared project/ecosystem capacity.' },
                    { id: 'long_term_stake', label: 'Long-Term Stake', percentage: 10, description: 'Reserved for long-term project alignment.' }
                ],
                financialSnapshot: {
                    creditOnHand: 0,
                    neededForNextTasks: 0,
                    alreadyDedicated: 0,
                    remainingNeed: 0
                }
            };
        }
        return copy;
    });
    const [isSaving, setIsSaving] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            const res = await getAllUsersForAdminAction();
            if (res.success && res.data) {
                setUsers(res.data);
            }
        };
        fetchUsers();
    }, []);

    const handleSave = async () => {
        // Validate default governance configurations before saving
        const gov = config.defaultGovernance;
        if (gov) {
            const sum = gov.valueFlow.reduce((acc, curr) => acc + curr.percentage, 0);
            if (sum !== 100) {
                toast({ title: 'Validation Error', description: `Default Value Flow allocations must sum to exactly 100% (currently ${sum}%).`, variant: 'destructive' });
                return;
            }
            if (gov.valueFlow.some(b => b.percentage < 0)) {
                toast({ title: 'Validation Error', description: 'Default percentages cannot be negative.', variant: 'destructive' });
                return;
            }
            if (gov.valueFlow.some(b => !b.label || b.label.trim() === '')) {
                toast({ title: 'Validation Error', description: 'Default labels cannot be empty.', variant: 'destructive' });
                return;
            }
        }

        setIsSaving(true);
        const res = await updatePlatformConfigAction(config);
        setIsSaving(false);
        if (res.success) {
            toast({ title: 'Config Saved', description: 'Platform configuration updated and cascaded.' });
        } else {
            toast({ title: 'Error', description: res.error, variant: 'destructive' });
        }
    };

    const toggleFeature = (feature: string) => {
        setConfig(prev => ({
            ...prev,
            defaultFeaturesEnabled: {
                ...prev.defaultFeaturesEnabled,
                [feature]: !prev.defaultFeaturesEnabled[feature]
            }
        }));
    };

    const handleAddAdmin = async () => {
        if (!selectedUserId) return;
        const res = await setUserAdminStatusAction(selectedUserId, true);
        if (res.success) {
            setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, role: 'admin' } : u));
            setSelectedUserId('');
            toast({ title: 'Admin added', description: 'User role updated to admin.' });
        } else {
            toast({ title: 'Error', description: res.error, variant: 'destructive' });
        }
    };

    const handleRemoveAdmin = async (userId: string) => {
        if (userId === currentUserId) {
            toast({ title: 'Action not allowed', description: 'You cannot remove yourself.', variant: 'destructive' });
            return;
        }
        const res = await setUserAdminStatusAction(userId, false);
        if (res.success) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: undefined } : u));
            toast({ title: 'Admin removed', description: 'User admin role removed.' });
        } else {
            toast({ title: 'Error', description: res.error, variant: 'destructive' });
        }
    };

    // Platform Governance form helpers
    const handleGovModelChange = (model: DecisionModel) => {
        setConfig(prev => ({
            ...prev,
            defaultGovernance: {
                ...prev.defaultGovernance!,
                decisionModel: model
            }
        }));
    };

    const handleGovSliderChange = (id: string, val: number[]) => {
        setConfig(prev => {
            const gov = prev.defaultGovernance!;
            return {
                ...prev,
                defaultGovernance: {
                    ...gov,
                    valueFlow: gov.valueFlow.map(b => b.id === id ? { ...b, percentage: val[0] } : b)
                }
            };
        });
    };

    const handleGovLabelChange = (id: string, newLabel: string) => {
        setConfig(prev => {
            const gov = prev.defaultGovernance!;
            return {
                ...prev,
                defaultGovernance: {
                    ...gov,
                    valueFlow: gov.valueFlow.map(b => b.id === id ? { ...b, label: newLabel } : b)
                }
            };
        });
    };

    const handleGovAddBucket = () => {
        setConfig(prev => {
            const gov = prev.defaultGovernance!;
            return {
                ...prev,
                defaultGovernance: {
                    ...gov,
                    valueFlow: [
                        ...gov.valueFlow,
                        { id: `custom_${Date.now()}`, label: 'Custom Allocation', percentage: 0, description: 'Default custom bucket.' }
                    ]
                }
            };
        });
    };

    const handleGovRemoveBucket = (id: string) => {
        setConfig(prev => {
            const gov = prev.defaultGovernance!;
            return {
                ...prev,
                defaultGovernance: {
                    ...gov,
                    valueFlow: gov.valueFlow.filter(b => b.id !== id)
                }
            };
        });
    };

    const handleGovSnapshotChange = (field: keyof FinancialSnapshot, value: string) => {
        const numVal = parseFloat(value) || 0;
        setConfig(prev => {
            const gov = prev.defaultGovernance!;
            return {
                ...prev,
                defaultGovernance: {
                    ...gov,
                    financialSnapshot: {
                        ...gov.financialSnapshot!,
                        [field]: numVal
                    }
                }
            };
        });
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Platform Admin</h1>
                <p className="text-muted-foreground">Manage global settings, AI models, and feature rollouts.</p>
            </div>

            {/* AI Configuration */}
            <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                <h2 className="text-xl font-semibold border-b pb-2">AI Configuration</h2>
                <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>Active AI Model</Label>
                        <Select 
                            value={config.activeAiModel} 
                            onValueChange={(val) => setConfig(prev => ({ ...prev, activeAiModel: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Firebase AI Logic)</SelectItem>
                                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Firebase AI Logic)</SelectItem>
                                <SelectItem value="perplexity-computer">Perplexity Computer API</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Select the primary model used by Queen and Jester.
                        </p>
                    </div>
                </div>
            </div>

            {/* Feature Flags */}
            <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                <h2 className="text-xl font-semibold border-b pb-2">Default Feature Flags</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div>
                            <Label className="text-base">Enable Session Queen</Label>
                            <p className="text-sm text-muted-foreground">Allow projects to use the Queen agent for task recommendations and project management.</p>
                        </div>
                        <Switch 
                            checked={config.defaultFeaturesEnabled['queen'] || false} 
                            onCheckedChange={() => toggleFeature('queen')}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div>
                            <Label className="text-base">Enable Jester Insights</Label>
                            <p className="text-sm text-muted-foreground">Allow Jester to analyze project activity and generate daily briefs.</p>
                        </div>
                        <Switch 
                            checked={config.defaultFeaturesEnabled['jester'] || false} 
                            onCheckedChange={() => toggleFeature('jester')}
                        />
                    </div>
                </div>
            </div>

            {/* Platform Default Governance */}
            {config.defaultGovernance && (
                <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                    <h2 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" /> Default Platform Governance (Global Template)
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Configure the default governance template inherited by new projects or projects set to "Open for Product (Global Platform)" source. Saving changes will automatically cascade to all inheriting projects.
                    </p>

                    <div className="space-y-6">
                        {/* Default Decision Model */}
                        <div className="space-y-2 max-w-md">
                            <Label className="text-sm font-semibold">Default Decision Model</Label>
                            <Select 
                                value={config.defaultGovernance.decisionModel} 
                                onValueChange={(val) => handleGovModelChange(val as DecisionModel)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select decision model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="project_lead">Project Lead</SelectItem>
                                    <SelectItem value="project_lead_advisory">Project Lead + Advisory Review</SelectItem>
                                    <SelectItem value="majority_vote">Majority Vote</SelectItem>
                                    <SelectItem value="consensus">Consensus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Default Value Flow Buckets */}
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-semibold">Default Value Flow Buckets</Label>
                                <Button variant="outline" size="sm" onClick={handleGovAddBucket} className="h-8 text-xs flex items-center gap-1">
                                    <Plus className="h-3.5 w-3.5" /> Add Default Bucket
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {config.defaultGovernance.valueFlow.map(bucket => {
                                    const isDefaultBucket = ['contributors', 'commons', 'long_term_stake'].includes(bucket.id);
                                    return (
                                        <div key={bucket.id} className="space-y-2 p-4 rounded-lg bg-slate-50/40 dark:bg-slate-950/40 border border-muted/50">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 flex-1 mr-4">
                                                    <Input 
                                                        value={bucket.label} 
                                                        onChange={(e) => handleGovLabelChange(bucket.id, e.target.value)}
                                                        className="h-8 font-semibold text-sm max-w-[240px] px-2 py-1"
                                                        placeholder="Bucket Name"
                                                    />
                                                    {!isDefaultBucket && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleGovRemoveBucket(bucket.id)}
                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
                                                    {bucket.percentage}%
                                                </Badge>
                                            </div>

                                            <div className="pt-2 flex items-center gap-4">
                                                <Slider 
                                                    value={[bucket.percentage]}
                                                    onValueChange={(val) => handleGovSliderChange(bucket.id, val)}
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Allocations Validation Sum */}
                            <div className="flex justify-end pt-2">
                                {(() => {
                                    const sum = config.defaultGovernance.valueFlow.reduce((acc, curr) => acc + curr.percentage, 0);
                                    return sum === 100 ? (
                                        <span className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Total Allocations: 100%</span>
                                    ) : (
                                        <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Total Allocations: {sum}% (Must be 100%)</span>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Default Financial Snapshot */}
                        <div className="space-y-4 pt-2 border-t">
                            <Label className="text-sm font-semibold">Default Financial Snapshot Values</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { field: 'creditOnHand' as const, label: 'Credit on Hand' },
                                    { field: 'neededForNextTasks' as const, label: 'Needed for Tasks' },
                                    { field: 'alreadyDedicated' as const, label: 'Already Dedicated' },
                                    { field: 'remainingNeed' as const, label: 'Remaining Need' }
                                ].map(snap => (
                                    <div key={snap.field} className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">{snap.label}</Label>
                                        <div className="relative mt-1">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                value={config.defaultGovernance.financialSnapshot?.[snap.field] ?? 0}
                                                onChange={(e) => handleGovSnapshotChange(snap.field, e.target.value)}
                                                className="h-8 text-xs pl-6"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Management */}
            <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                <h2 className="text-xl font-semibold border-b pb-2">Admin Management</h2>
                <div className="space-y-6">
                    <div>
                        <Label>Current Admins</Label>
                        <div className="mt-2 space-y-2">
                            {users.filter(u => u.role === 'admin').map(adminUser => (
                                <div key={adminUser.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                                    <div>
                                        <p className="font-medium">{adminUser.name}</p>
                                        <p className="text-xs text-muted-foreground">{adminUser.email}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(adminUser.id)} disabled={adminUser.id === currentUserId}>
                                        Remove
                                    </Button>
                                </div>
                            ))}
                            {users.filter(u => u.role === 'admin').length === 0 && (
                                <p className="text-sm text-muted-foreground">No admins configured.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Add New Admin</Label>
                        <div className="flex gap-2">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="max-w-md">
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.filter(u => u.role !== 'admin').map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleAddAdmin} disabled={!selectedUserId}>Add Admin</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Square Webhook Logs */}
            <SquareWebhookLogs />

            <div className="flex justify-end gap-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Configuration
                </Button>
            </div>
        </div>
    );
}
