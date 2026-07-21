'use client';

import { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from './user-avatar';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HydratedProjectMember, User } from '@/lib/types';
import { getInitials, toDate } from '@/lib/utils';
import { acceptInviteAction, getCollaboratorsAction, cancelInviteAction, resendInviteAction, sendProjectInviteAction, rejectInviteAction } from '@/app/actions/invite';
import type { ProjectInvite } from '@/lib/types';
import { subscribeToProjectInvites, subscribeToMyProjectInvites } from '@/lib/data.client';
import { getProjectFollowersAction } from '@/app/actions/projects';
import { updateProjectNotificationLevelAction } from '@/app/actions/roles';
import { buildHybridUrl } from '@/lib/slug';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Send, Trash2, RefreshCw, MessageSquare, Mail, UserPlus, Loader2, ChevronDown, ChevronRight, Users } from "lucide-react";

interface ProjectTeamProps {
    projectId: string;
    projectName?: string;
    team: HydratedProjectMember[];
    users: User[];
    currentUser: User | null;
    addTeamMember: (userId: string) => void;
    isLead: boolean;
    applyForRole: (userId: string, role: 'lead' | 'contributor' | 'participant') => Promise<void>;
    approveRoleApplication: (userId: string, role: 'lead' | 'contributor' | 'participant') => Promise<void>;
    denyRoleApplication: (userId: string) => Promise<void>;
}

export default function ProjectTeam({
    projectId,
    projectName,
    team,
    currentUser,
    isLead,
    applyForRole,
    approveRoleApplication,
    denyRoleApplication
}: ProjectTeamProps) {
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [emailInvites, setEmailInvites] = useState<ProjectInvite[]>([]);
    const [inviteDismissed, setInviteDismissed] = useState(false);
    const [collaborators, setCollaborators] = useState<{ id: string, name: string, email: string, username?: string }[]>([]);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'lead' | 'contributor' | 'participant'>('participant');
    const [customMessage, setCustomMessage] = useState('');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [isComboOpen, setIsComboOpen] = useState(false);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [followers, setFollowers] = useState<Array<{ id: string; name: string; avatarUrl?: string; username?: string }>>([]);
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [isFollowersOpen, setIsFollowersOpen] = useState(false);

    const handleOpenFollowers = async () => {
        setIsFollowersOpen(true);
        setLoadingFollowers(true);
        try {
            const res = await getProjectFollowersAction(projectId);
            if (res.success && res.data) {
                setFollowers(res.data);
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to load followers', variant: 'destructive' });
        } finally {
            setLoadingFollowers(false);
        }
    };

    const { toast } = useToast();
    const router = useRouter();

    // Real-time invite subscription — mirrors the tasks/fundingGoals pattern.
    // Leads subscribe to all invites for the project; non-leads subscribe to their own.
    useEffect(() => {
        if (!currentUser) return;

        let unsub: (() => void) | undefined;

        if (isLead) {
            unsub = subscribeToProjectInvites(projectId, setEmailInvites);
        } else {
            unsub = subscribeToMyProjectInvites(projectId, currentUser.email, setEmailInvites);
        }

        return () => unsub?.();
    }, [projectId, isLead, currentUser]);

    useEffect(() => {
        if (isLead) {
            getCollaboratorsAction().then(res => {
                if (res.success && res.data) {
                    setCollaborators(res.data);
                }
            });
        }
    }, [projectId, isLead]);

    const { pendingMembers, approvedMembers } = useMemo(() => {
        const pending = team.filter(member => member.pendingRole);
        const approved = team.filter(member => !member.pendingRole);
        return { pendingMembers: pending, approvedMembers: approved };
    }, [team]);

    const userMap = useMemo(() => new Map(team.map(member => [member.userId, member])), [team]);
    const isCurrentUserMember = currentUser ? userMap.has(currentUser.id) : false;
    const currentUserMember = currentUser ? userMap.get(currentUser.id) : undefined;

    useEffect(() => {
        if (isCurrentUserMember) {
            getProjectFollowersAction(projectId).then(res => {
                if (res.success && res.data) {
                    setFollowers(res.data);
                }
            });
        }
    }, [projectId, isCurrentUserMember]);

    const availableRoles: Array<'participant' | 'contributor' | 'lead'> = ['participant', 'contributor', 'lead'];

    const selectableRoles = useMemo(() => {
        if (!currentUserMember) {
            return availableRoles;
        }
        return availableRoles.filter(role => role !== currentUserMember.role);
    }, [currentUserMember]);

    const [selectedRole, setSelectedRole] = useState<'lead' | 'contributor' | 'participant'>(selectableRoles[0] || 'participant');

    useEffect(() => {
        if (selectableRoles.length > 0 && !selectableRoles.includes(selectedRole)) {
            setSelectedRole(selectableRoles[0]);
        }
    }, [selectableRoles, selectedRole]);

    const handleApply = async () => {
        if (!currentUser) return;
        setLoading({ [currentUser.id]: true });
        await applyForRole(currentUser.id, selectedRole);
    };

    const handleApprove = async (userId: string, role: 'lead' | 'contributor' | 'participant') => {
        setLoading({ [userId]: true });
        await approveRoleApplication(userId, role);
    };

    const handleDeny = async (userId: string) => {
        setLoading({ [userId]: true });
        await denyRoleApplication(userId);
    };

    const handleUpdateNotificationLevel = async (level: 0 | 1 | 2 | 3) => {
        if (!currentUser) return;
        setLoading({ 'update-notif-level': true });
        try {
            const res = await updateProjectNotificationLevelAction({ projectId, notificationLevel: level });
            if (res.success) {
                toast({ title: 'Success', description: 'message' in res ? res.message : 'Updated' });
            } else {
                toast({ title: 'Error', description: 'error' in res ? res.error : 'Failed', variant: 'destructive' });
            }
        } finally {
            setLoading({ 'update-notif-level': false });
        }
    };

    const handleAcceptInvite = async (token: string) => {
        setLoading({ 'accept-invite': true });
        try {
            const res = await acceptInviteAction(token);
            if (res.success) {
                toast({ title: 'Success', description: 'You have joined the project team!' });
                router.refresh();
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setLoading({ 'accept-invite': false });
        }
    };

    const handleRejectInvite = async (inviteId: string) => {
        setLoading({ 'reject-invite': true });
        try {
            const res = await rejectInviteAction(inviteId);
            if (res.success) {
                toast({ title: 'Invitation declined', description: 'You have declined the project invitation.' });
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setLoading({ 'reject-invite': false });
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail) return;
        setIsInviting(true);
        try {
            const res = await sendProjectInviteAction({
                projectId,
                recipientEmail: inviteEmail.trim(),
                role: inviteRole,
                customMessage
            });
            if (res.success) {
                toast({ title: 'Success', description: `Invitation sent to ${inviteEmail}` });
                setInviteEmail('');
                setCustomMessage('');
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setIsInviting(false);
        }
    };

    const handleCancelInvite = async (id: string) => {
        setLoading({ [id]: true });
        try {
            const res = await cancelInviteAction(id);
            if (res.success) {
                toast({ title: 'Success', description: 'Invitation cancelled' });
            }
        } finally {
            setLoading({ [id]: false });
        }
    };

    const handleResendInvite = async (id: string) => {
        setLoading({ [id]: true });
        try {
            const res = await resendInviteAction(id, customMessage);
            if (res.success) {
                toast({ title: 'Success', description: 'Invitation resent' });
            }
        } finally {
            setLoading({ [id]: false });
        }
    };

    const myInvite = useMemo(() => {
        if (!currentUser) return null;
        if (isCurrentUserMember) return null;
        return emailInvites.find(i => i.email === currentUser.email && (i.status === 'pending' || i.status === 'declined'));
    }, [emailInvites, currentUser, isCurrentUserMember]);

    const filteredCollaborators = useMemo(() => {
        if (!inviteEmail) return [];
        const search = inviteEmail.toLowerCase();
        return collaborators.filter(c =>
            (c.name && c.name.toLowerCase().includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search)) ||
            (c.username && c.username.toLowerCase().includes(search))
        ).slice(0, 5); // Limit to top 5 suggestions
    }, [collaborators, inviteEmail]);

    useEffect(() => {
        if (filteredCollaborators.length > 0 && !isComboOpen) {
            setIsComboOpen(true);
        } else if (filteredCollaborators.length === 0 && isComboOpen) {
            setIsComboOpen(false);
        }
    }, [filteredCollaborators, isComboOpen]);

    const pendingInvites = useMemo(() => emailInvites.filter(i => i.status === 'pending'), [emailInvites]);
    const historyInvites = useMemo(() => emailInvites.filter(i => i.status !== 'pending'), [emailInvites]);

    return (
        <div className="space-y-6">
            {/* Pending invite — Accept / Reject buttons */}
            {myInvite?.status === 'pending' && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900">
                    <CardHeader>
                        <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Project Invitation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-amber-700 dark:text-amber-300 mb-4">
                            You have been invited to join this project as a <strong>{myInvite.role}</strong>.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => handleAcceptInvite(myInvite.token)}
                                disabled={loading['accept-invite'] || loading['reject-invite']}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {loading['accept-invite'] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Accept Invitation
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleRejectInvite(myInvite.id)}
                                disabled={loading['accept-invite'] || loading['reject-invite']}
                                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                {loading['reject-invite'] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reject Invitation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Declined invite — thank you card, dismissible */}
            {myInvite?.status === 'declined' && !inviteDismissed && (
                <Card className="border-green-100 bg-green-50/60 dark:bg-green-900/10 dark:border-green-900/40">
                    <CardContent className="pt-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                                    Thanks for taking a look{projectName ? ` at ${projectName}` : ''}.
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    We appreciate you considering this project. You&apos;re always welcome back if your situation changes.
                                </p>
                            </div>
                            <button
                                onClick={() => setInviteDismissed(true)}
                                className="shrink-0 text-green-600/60 hover:text-green-700 dark:text-green-400/60 dark:hover:text-green-300 transition-colors mt-0.5"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!currentUserMember?.pendingRole && selectableRoles.length > 0 && currentUser && (
                <Card>
                    <CardHeader>
                        <CardTitle>{isCurrentUserMember ? 'Apply for a New Role' : 'Join the Project'}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-4">
                        <Select onValueChange={(value: 'lead' | 'contributor' | 'participant') => setSelectedRole(value)} value={selectedRole}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectableRoles.map(role => (
                                    <SelectItem key={role} value={role} className="capitalize">
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleApply} disabled={loading[currentUser.id] || !selectedRole}>
                            {loading[currentUser.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Apply
                        </Button>
                    </CardContent>
                </Card>
            )}

            {isLead && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Invite Member
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <div className="relative w-full">
                                    <Input
                                        placeholder="Email address or name..."
                                        value={inviteEmail}
                                        onChange={(e) => {
                                            setInviteEmail(e.target.value);
                                            setIsComboOpen(true);
                                        }}
                                        onFocus={() => { if (filteredCollaborators.length > 0) setIsComboOpen(true); }}
                                        onBlur={() => {
                                            // Delay closing so clicks on suggestions register
                                            setTimeout(() => setIsComboOpen(false), 200);
                                        }}
                                        className="pr-10"
                                    />
                                    <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                </div>
                                {isComboOpen && filteredCollaborators.length > 0 && (
                                    <div className="absolute top-full left-0 mt-1 w-full z-50 bg-popover text-popover-foreground rounded-md border shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden max-h-[300px] overflow-y-auto">
                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                            Suggestions
                                        </div>
                                        <div className="p-1">
                                            {filteredCollaborators.map((c) => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setInviteEmail(c.email);
                                                        setIsComboOpen(false);
                                                    }}
                                                    onMouseDown={(e) => {
                                                        // Prevent blur from firing before click
                                                        e.preventDefault();
                                                    }}
                                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{c.name}</span>
                                                        <span className="text-xs text-muted-foreground">{c.email}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Select onValueChange={(value: any) => setInviteRole(value)} value={inviteRole}>
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="participant">Participant</SelectItem>
                                    <SelectItem value="contributor">Contributor</SelectItem>
                                    <SelectItem value="lead">Lead</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsMessageModalOpen(true)}
                                    className={cn(customMessage && "text-primary border-primary/20 bg-primary/10")}
                                    title="Edit invitation message"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={handleSendInvite}
                                    disabled={isInviting || !inviteEmail}
                                    className="flex-1 sm:flex-none"
                                >
                                    {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Send
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLead && pendingInvites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Pending Invitations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingInvites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/50 dark:bg-gray-800 rounded-lg">
                                <div>
                                    <p className="font-semibold">{invite.email}</p>
                                    <div className="flex gap-2 text-sm text-gray-500 items-center mt-1">
                                        <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                                        <span className="text-amber-500 font-medium text-xs">Pending</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleResendInvite(invite.id)}
                                        disabled={loading[invite.id]}
                                        title="Resend Invitation"
                                    >
                                        <RefreshCw className={cn("h-4 w-4", loading[invite.id] && "animate-spin")} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleCancelInvite(invite.id)}
                                        disabled={loading[invite.id]}
                                        title="Cancel Invitation"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {isLead && historyInvites.length > 0 && (
                <Card>
                    <CardHeader className="cursor-pointer select-none hover:bg-muted/50 dark:hover:bg-gray-800/30 transition-colors" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-5 w-5" />
                                Invitation History
                            </CardTitle>
                            {isHistoryExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </CardHeader>
                    {isHistoryExpanded && (
                        <CardContent className="space-y-4">
                            {historyInvites.map(invite => (
                                <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/30 dark:bg-gray-800/50 rounded-lg opacity-80">
                                    <div>
                                        <p className="font-semibold text-muted-foreground">{invite.email}</p>
                                        <div className="flex gap-2 text-sm text-gray-500 items-center mt-1">
                                            <Badge variant="outline" className="capitalize opacity-70">{invite.role}</Badge>
                                            <span className="capitalize text-xs">
                                                Status: <span className={cn(
                                                    "font-medium",
                                                    invite.status === 'accepted' ? 'text-green-500' :
                                                        invite.status === 'declined' ? 'text-red-500' :
                                                            invite.status === 'cancelled' ? 'text-gray-500' : 'text-gray-500'
                                                )}>{invite.status}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {invite.status === 'expired' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleResendInvite(invite.id)}
                                                disabled={loading[invite.id]}
                                                title="Renew and Resend"
                                            >
                                                <RefreshCw className={cn("h-4 w-4", loading[invite.id] && "animate-spin")} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Message Editor Modal */}
            <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personalize Invitation</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            Add a custom message that will appear in the invitation email.
                        </p>
                        <Textarea
                            placeholder="e.g., Hey! We'd love to have your expertise on this project..."
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setCustomMessage(''); setIsMessageModalOpen(false) }}>Clear</Button>
                        <Button onClick={() => setIsMessageModalOpen(false)}>Save Message</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {currentUserMember?.pendingRole && (
                <Card>
                    <CardContent className='pt-6'>
                        <p>Your application for the <strong>{currentUserMember.pendingRole}</strong> role is pending approval.</p>
                    </CardContent>
                </Card>
            )}

            {isLead && pendingMembers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Applications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingMembers.map(member => (
                            <div key={member.userId} className="flex items-center justify-between p-2 bg-muted/50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    {member.user ? (
                                        <UserAvatar user={member.user} className="h-10 w-10" />
                                    ) : (
                                        <Avatar>
                                            <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div>
                                        <p className="font-semibold">{member.user?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-gray-500">Applied for: <strong>{member.pendingRole}</strong></p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleApprove(member.userId, member.pendingRole!)}
                                        disabled={loading[member.userId]}
                                    >
                                        {loading[member.userId] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeny(member.userId)}
                                        disabled={loading[member.userId]}
                                    >
                                        {loading[member.userId] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Deny
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Team Members</CardTitle>
                    {isCurrentUserMember && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={handleOpenFollowers}
                        >
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Followers: {followers.length}</span>
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {approvedMembers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {approvedMembers.map(member => {
                                const currentLevel = member.notificationLevel !== undefined
                                    ? member.notificationLevel
                                    : (currentUser?.globalNotificationLevel !== undefined ? currentUser.globalNotificationLevel : 1);

                                return (
                                    <div key={member.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center space-x-4 shrink-0">
                                            {member.user ? (
                                                <UserAvatar user={member.user} className="h-10 w-10 shrink-0" />
                                            ) : (
                                                <Avatar className="shrink-0">
                                                    <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold">{member.user?.name || 'Unknown User'}</p>
                                                    {member.user?.updatedAt && (Date.now() - toDate(member.user.updatedAt).getTime() > 180 * 24 * 60 * 60 * 1000) && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Inactive</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                                            </div>
                                        </div>
                                        {currentUser && member.userId === currentUser.id && (
                                            <div className="text-xs sm:ml-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                                                <Select
                                                    value={currentLevel.toString()}
                                                    onValueChange={(val) => handleUpdateNotificationLevel(parseInt(val, 10) as 0 | 1 | 2 | 3)}
                                                    disabled={loading['update-notif-level']}
                                                >
                                                    <SelectTrigger className="h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 text-xs font-normal text-muted-foreground hover:text-foreground flex flex-col items-start text-left gap-0.5 whitespace-normal">
                                                        <span className="text-muted-foreground">Notification preferences:</span>
                                                        <span className="font-medium text-primary underline underline-offset-2">
                                                            <SelectValue />
                                                        </span>
                                                    </SelectTrigger>
                                                    <SelectContent align="start" className="w-[300px]">
                                                        <SelectGroup>
                                                            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                                                                Notify me for:
                                                            </SelectLabel>
                                                            <SelectItem value="0" className="text-xs">none</SelectItem>
                                                            <SelectItem value="1" className="text-xs">1. Goal milestones, and published Posts</SelectItem>
                                                            <SelectItem value="2" className="text-xs">1 &amp; 2. Completed tasks</SelectItem>
                                                            <SelectItem value="3" className="text-xs">2 &amp; 3. All task and general project updates</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p>No approved team members yet.</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFollowersOpen} onOpenChange={setIsFollowersOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Project Followers</DialogTitle>
                    </DialogHeader>
                    {loadingFollowers ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : followers.length > 0 ? (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 py-1">
                            {followers.map(follower => {
                                const profileUrl = buildHybridUrl('/profile', follower.id, follower.username || follower.name);
                                return (
                                    <div key={follower.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/55 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={{ name: follower.name, avatarUrl: follower.avatarUrl }} className="h-9 w-9" />
                                            <div>
                                                <a href={profileUrl} className="font-medium hover:underline text-sm block">
                                                    {follower.name}
                                                </a>
                                                {follower.username && (
                                                    <span className="text-xs text-muted-foreground block">
                                                        @{follower.username}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <a href={profileUrl} className="text-xs text-primary hover:underline">
                                            View Profile
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">No users are following this project yet.</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
