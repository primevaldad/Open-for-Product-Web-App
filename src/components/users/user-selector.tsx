
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

interface UserSelectorProps {
  users?: User[]; // Made optional
  value: ProjectMember[];
  onChange: (value: ProjectMember[]) => void;
}

export default function UserSelector({ users = [], value, onChange }: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);

  // Maps for quick lookups
  const userMap = React.useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const selectedUserIds = React.useMemo(() => new Set(value.map(pm => pm.userId)), [value]);

  const handleSelect = (userId: string) => {
    if (selectedUserIds.has(userId)) return; // Already selected
    // Assume a default role when adding a new member via the selector
    const newMember: ProjectMember = { userId, role: 'participant' }; 
    onChange([...value, newMember]);
  };

  const handleRemove = (userId: string) => {
    onChange(value.filter(pm => pm.userId !== userId));
  };

  const getDisplayName = (userId: string) => {
    return userMap.get(userId)?.name || userId;
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto"
          >
            <div className="flex flex-wrap gap-1">
              {value.length === 0 && "Select users..."}
              {value.map((member) => (
                <Badge key={member.userId} variant="secondary" className="flex items-center gap-1">
                  {getDisplayName(member.userId)}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${getDisplayName(member.userId)}`}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the popover
                      handleRemove(member.userId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        handleRemove(member.userId);
                      }
                    }}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X size={12} />
                  </span>
                </Badge>
              ))}
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
                    value={user.id} // Use user ID for the command value
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
