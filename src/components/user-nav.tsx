
'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreditCard, LogOut, Settings, User as UserIcon, Users } from "lucide-react"
import Link from "next/link"
import { useTransition } from "react";
import { switchUser } from "@/app/actions/auth";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/types";
import { getInitials } from "@/lib/utils";

interface UserNavProps {
  currentUser: User;
  allUsers: User[];
}

export function UserNav({ currentUser, allUsers }: UserNavProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUserSwitch = (userId: string) => {
    startTransition(async () => {
        const result = await switchUser({ userId });
        if (result?.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="woman smiling" />
            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={`/profile/${currentUser.id}`}>
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
          <Link href="/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
         <DropdownMenuGroup>
            <DropdownMenuLabel>
                <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Switch User</span>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={currentUser.id} onValueChange={handleUserSwitch}>
                 {allUsers.map(u => (
                    <DropdownMenuRadioItem key={u.id} value={u.id} disabled={isPending}>
                        {u.name}
                    </DropdownMenuRadioItem>
                 ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
