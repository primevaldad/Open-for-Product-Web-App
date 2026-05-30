'use client';

import { useState, useEffect } from 'react';
import { PlatformConfig, User } from '@/lib/types';
import { updatePlatformConfigAction, getAllUsersForAdminAction } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function AdminClientPage({ initialConfig, currentUserId }: { initialConfig: PlatformConfig, currentUserId: string }) {
    const [config, setConfig] = useState<PlatformConfig>(initialConfig);
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
        setIsSaving(true);
        const res = await updatePlatformConfigAction(config);
        setIsSaving(false);
        if (res.success) {
            toast({ title: 'Config Saved', description: 'Platform configuration updated.' });
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

    const handleAddAdmin = () => {
        if (selectedUserId && !config.adminUserIds.includes(selectedUserId)) {
            setConfig(prev => ({
                ...prev,
                adminUserIds: [...(prev.adminUserIds || []), selectedUserId]
            }));
            setSelectedUserId('');
        }
    };

    const handleRemoveAdmin = (userId: string) => {
        if (userId === currentUserId) {
            toast({ title: 'Action not allowed', description: 'You cannot remove yourself.', variant: 'destructive' });
            return;
        }
        setConfig(prev => ({
            ...prev,
            adminUserIds: (prev.adminUserIds || []).filter(id => id !== userId)
        }));
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Platform Admin</h1>
                <p className="text-muted-foreground">Manage global settings, AI models, and feature rollouts.</p>
            </div>

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

            <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
                <h2 className="text-xl font-semibold border-b pb-2">Admin Management</h2>
                <div className="space-y-6">
                    <div>
                        <Label>Current Admins</Label>
                        <div className="mt-2 space-y-2">
                            {(config.adminUserIds || []).map(adminId => {
                                const user = users.find(u => u.id === adminId);
                                return (
                                    <div key={adminId} className="flex items-center justify-between p-3 border rounded-md bg-background">
                                        <div>
                                            <p className="font-medium">{user ? user.name : adminId}</p>
                                            <p className="text-xs text-muted-foreground">{user ? user.email : ''}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAdmin(adminId)} disabled={adminId === currentUserId}>
                                            Remove
                                        </Button>
                                    </div>
                                );
                            })}
                            {(!config.adminUserIds || config.adminUserIds.length === 0) && (
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
                                    {users.filter(u => !(config.adminUserIds || []).includes(u.id)).map(user => (
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

            <div className="flex justify-end gap-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Configuration
                </Button>
            </div>
        </div>
    );
}
