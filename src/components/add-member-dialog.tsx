
'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HydratedProjectMember, User, ProjectMember } from '@/lib/types';

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (userId: string, role: ProjectMember['role']) => void;
  currentTeam: HydratedProjectMember[];
  users: User[];
}

export default function AddMemberDialog({
  isOpen,
  onClose,
  onAddMember,
  currentTeam,
  users,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [role, setRole] = useState<ProjectMember['role']>('participant');
  const [searchTerm, setSearchTerm] = useState('');

  const availableUsers = useMemo(() => {
    const teamUserIds = new Set(currentTeam.map(member => member.userId));
    return users.filter(user => !teamUserIds.has(user.id));
  }, [users, currentTeam]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return availableUsers;
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableUsers, searchTerm]);

  const handleAddClick = () => {
    if (selectedUserId && role) {
      onAddMember(selectedUserId, role);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Select onValueChange={setSelectedUserId} value={selectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={value => setRole(value as ProjectMember['role'])} value={role}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Participant</SelectItem>
              <SelectItem value="contributor">Contributor</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAddClick} disabled={!selectedUserId}>
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
