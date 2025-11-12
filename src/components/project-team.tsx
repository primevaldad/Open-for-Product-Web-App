'use client';

import { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { HydratedProjectMember, User } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ProjectTeamProps {
    team: HydratedProjectMember[];
    users: User[];
    currentUser: User;
    addTeamMember: (userId: string) => void;
    isLead: boolean;
    applyForRole: (userId: string, role: 'lead' | 'contributor' | 'participant') => Promise<void>;
    approveRoleApplication: (userId: string, role: 'lead' | 'contributor' | 'participant') => Promise<void>;
    denyRoleApplication: (userId: string) => Promise<void>;
}

export default function ProjectTeam({
    team,
    currentUser,
    isLead,
    applyForRole,
    approveRoleApplication,
    denyRoleApplication
}: ProjectTeamProps) {
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const { pendingMembers, approvedMembers } = useMemo(() => {
        const pending = team.filter(member => member.pendingRole);
        const approved = team.filter(member => !member.pendingRole);
        return { pendingMembers: pending, approvedMembers: approved };
    }, [team]);

    const userMap = useMemo(() => new Map(team.map(member => [member.userId, member])), [team]);
    const isCurrentUserMember = userMap.has(currentUser.id);
    const currentUserMember = userMap.get(currentUser.id);

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

    return (
        <div className="space-y-6">
            {!currentUserMember?.pendingRole && selectableRoles.length > 0 && (
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
                            <div key={member.userId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarImage src={member.user?.avatarUrl} alt={member.user?.name || 'User avatar'} />
                                        <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                                    </Avatar>
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
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                    {approvedMembers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {approvedMembers.map(member => (
                                <div key={member.userId} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <Avatar>
                                        <AvatarImage src={member.user?.avatarUrl} alt={member.user?.name || 'User avatar'} />
                                        <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{member.user?.name || 'Unknown User'}</p>
                                        <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No approved team members yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
