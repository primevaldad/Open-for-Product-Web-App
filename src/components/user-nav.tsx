
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreditCard, LogOut, Settings, User as UserIcon, Bell } from "lucide-react"
import Link from "next/link"
import type { User } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

interface UserNavProps {
  currentUser: User | null;
}

export function UserNav({ currentUser }: UserNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  if (!currentUser) {
    return (
        <div className="flex items-center gap-2">
            <Link href="/login">
                <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
                <Button>Sign Up</Button>
            </Link>
        </div>
    );
  }

  const unreadNotifications = currentUser.notifications?.filter(n => !n.read) ?? [];
  const hasUnread = unreadNotifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="woman smiling" />
            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
          {hasUnread && <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
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
         <DropdownMenuLabel>Notifications</DropdownMenuLabel>
         <DropdownMenuGroup>
            {currentUser.notifications && currentUser.notifications.length > 0 ? (
              currentUser.notifications.slice(0, 3).map(n => (
                <Link href={n.link} key={n.id}>
                  <DropdownMenuItem className="flex items-start gap-2">
                    <div className="w-4 pt-1">
                      {!n.read && <span className="inline-flex rounded-full h-2 w-2 bg-primary"></span>}
                    </div>
                    <span className="flex-1 text-xs text-wrap">{n.message}</span>
                  </DropdownMenuItem>
                </Link>
              ))
            ) : (
              <DropdownMenuItem disabled>
                <Bell className="mr-2 h-4 w-4" />
                <span>No new notifications</span>
              </DropdownMenuItem>
            )}
         </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
