'use client';

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { User, ProjectMember } from "@/lib/types";

// Helper to reliably get the user ID from different possible member structures.
const getMemberId = (member: any): string => {
  // Handles ProjectMember and HydratedProjectMember where `userId` is a string.
  if (typeof member.userId === 'string') {
    return member.userId;
  }
  // Handles cases where the member is the full User object.
  if (typeof member.id === 'string') {
    return member.id;
  }
  // Handles cases where `userId` is an object like `{ id: '...' }`
  if (member.userId && typeof member.userId.id === 'string') {
    return member.userId.id;
  }
  console.warn("Could not determine a unique ID for member:", member);
  return JSON.stringify(member); // Fallback to avoid crashes, but indicates a data issue.
};


interface UserSelectorProps {
  users?: User[];
  value: (ProjectMember | any)[]; // Loosen type to handle inconsistent data
  onChange: (value: ProjectMember[]) => void;
  id?: string;
}

export default function UserSelector({ users = [], value, onChange, id }: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Effect to clean and synchronize the canonical state
  React.useEffect(() => {
    if (!value) return;
    const uniqueValue = Array.from(new Map(value.map(item => [getMemberId(item), item])).values());
    if (uniqueValue.length !== value.length) {
      // When syncing, ensure we only pass back the canonical ProjectMember structure.
      const canonicalValues = uniqueValue.map(member => ({
        userId: getMemberId(member),
        role: member.role || 'participant',
      }));
      onChange(canonicalValues);
    }
  }, [value, onChange]);

  // Memoized list for rendering, de-duplicated with our robust helper.
  const uniqueValueForRender = React.useMemo(() => {
    if (!value) return [];
    return Array.from(new Map(value.map(item => [getMemberId(item), item])).values());
  }, [value]);

  const userMap = React.useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const selectedUserIds = React.useMemo(() => new Set(uniqueValueForRender.map(getMemberId)), [uniqueValueForRender]);

  const handleSelect = (userId: string) => {
    if (selectedUserIds.has(userId)) return;
    const newMember: ProjectMember = { userId, role: 'participant' };
    onChange([...(value || []), newMember]);
  };

  const handleRemove = (userIdToRemove: string) => {
    onChange(value.filter(pm => getMemberId(pm) !== userIdToRemove));
  };

  // Gets the display name, prioritizing the hydrated `user` object if it exists.
  const getDisplayName = (member: any): string => {
    if (member.user && typeof member.user.name === 'string') {
      return member.user.name;
    }
    const memberId = getMemberId(member);
    return userMap.get(memberId)?.name || memberId;
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto"
          >
            <div className="flex flex-wrap gap-1">
              {uniqueValueForRender.length === 0 && "Select users..."}
              {uniqueValueForRender.map((member) => {
                const memberId = getMemberId(member);
                return (
                  <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                    {getDisplayName(member)}
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remove ${getDisplayName(member)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(memberId);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          handleRemove(memberId);
                        }
                      }}
                      className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X size={12} />
                    </span>
                  </Badge>
                );
              })}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      handleSelect(user.id);
                      setOpen(false);
                    }}
                    disabled={selectedUserIds.has(user.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedUserIds.has(user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {user.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
