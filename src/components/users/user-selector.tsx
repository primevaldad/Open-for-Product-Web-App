
"use client";

import * as React from "react";
import { Check, X, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchUsers, findUsersByIds } from "@/app/actions/users"; 
import { useDebounce } from "@/hooks/use-debounce";
import { type User, type ProjectMember, ROLES, type UserRole } from "@/lib/types";

type UserWithRole = User & { role: UserRole };

interface UserSelectorProps {
  value: ProjectMember[];
  onChange: (value: ProjectMember[]) => void;
  placeholder?: string;
}

export function UserSelector({ value, onChange, placeholder = "Add members..." }: UserSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = React.useState<UserWithRole[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    const fetchInitialUsers = async () => {
      if (value && value.length > 0) {
        const userIds = value.map(member => member.userId);
        const users = await findUsersByIds(userIds);
        const usersWithRoles = users.map((user: User) => ({
          ...user,
          role: value.find(member => member.userId === user.id)?.role || 'contributor',
        }));
        setSelectedUsers(usersWithRoles);
      }
    };
    fetchInitialUsers();
  }, [value]);

  React.useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm) {
        const users = await searchUsers(debouncedSearchTerm);
        const filteredUsers = users.filter(user => !selectedUsers.some(su => su.id === user.id));
        setSearchResults(filteredUsers);
      } else {
        setSearchResults([]);
      }
    };
    performSearch();
  }, [debouncedSearchTerm, selectedUsers]);

  const handleSelect = (user: User) => {
    const newSelectedUsers = [...selectedUsers, { ...user, role: 'contributor' as const }];
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers.map(u => ({ userId: u.id, role: u.role })));
    setSearchTerm("");
  };

  const handleRemove = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter(user => user.id !== userId);
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers.map(u => ({ userId: u.id, role: u.role })));
  };

  const handleRoleChange = (userId: string, role: UserRole) => {
    const newSelectedUsers = selectedUsers.map(user => 
      user.id === userId ? { ...user, role } : user
    );
    setSelectedUsers(newSelectedUsers);
    onChange(newSelectedUsers.map(u => ({ userId: u.id, role: u.role })));
  };

  return (
    <div className="space-y-3">
      <p className='text-sm text-muted-foreground'>Assign roles to your team members. Leads have special permissions.</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between h-auto min-h-10")}
            onClick={() => setOpen(!open)}
          >
            <div className="flex flex-wrap items-center gap-2">
              {selectedUsers.length > 0 ? (
                selectedUsers.map(user => (
                  <Badge
                    key={user.id}
                    variant={user.role === 'lead' ? 'default' : 'secondary'}
                    className="flex items-center gap-1.5 py-1"
                  >
                    {user.name}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select onValueChange={(role: UserRole) => handleRoleChange(user.id, role)} value={user.role}>
                          <SelectTrigger className="w-[110px] h-6 ml-2 -mr-1 text-xs focus:ring-0">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                              {ROLES.map(role => (
                                  <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => { e.stopPropagation(); handleRemove(user.id); }}
                      aria-label={`Remove ${user.name}`}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="font-normal text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Search by name or email..."
            />
            <CommandList>
              <CommandEmpty>No users found for "{searchTerm}".</CommandEmpty>
              <CommandGroup>
                {searchResults.map(user => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => handleSelect(user)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedUsers.some(su => su.id === user.id) ? "opacity-100" : "opacity-0")} />
                    {user.name} - <span className="text-xs text-muted-foreground">{user.email}</span>
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
