
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AddMemberDialog from './add-member-dialog'; 
import type { HydratedProjectMember, User, ProjectMember } from '@/lib/types';

interface ProjectTeamProps {
  team: HydratedProjectMember[];
  users: User[];
  currentUser: User | null;
  addTeamMember: (userId: string, role: ProjectMember['role']) => void;
  isLead: boolean;
}

export default function ProjectTeam({ team, users, currentUser, addTeamMember, isLead }: ProjectTeamProps) {
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Team Members</h2>
        {isLead && (
          <Button onClick={() => setIsAddMemberDialogOpen(true)}>Add Member</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => (
          <div key={member.userId} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Avatar>
              <AvatarImage src={member.user?.avatarUrl} alt={member.user?.name} />
              <AvatarFallback>{member.user?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{member.user?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
            </div>
          </div>
        ))}
      </div>

      {isLead && (
        <AddMemberDialog
          isOpen={isAddMemberDialogOpen}
          onClose={() => setIsAddMemberDialogOpen(false)}
          onAddMember={addTeamMember}
          currentTeam={team}
          users={users}
        />
      )}
    </div>
  );
}
