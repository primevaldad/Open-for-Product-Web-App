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
import { useAuth } from "@/components/auth-provider"; 
import { useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface UserNavProps {
  currentUser: User | null;
}

export function UserNav({ currentUser }: UserNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser: clientUser, loading, signOut } = useAuth(); 

  const user = clientUser || currentUser;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user || user.role === 'guest') {
    const redirectTo = encodeURIComponent(pathname);
    return (
        <div className="flex items-center gap-2">
            <Link href={`/login?redirectTo=${redirectTo}`}>
                <Button variant="ghost">Log In</Button>
            </Link>
            <Link href={`/signup?redirectTo=${redirectTo}`}>
                <Button>Sign Up</Button>
            </Link>
        </div>
    );
  }

  const unreadNotifications = user.notifications?.filter(n => !n.isRead) ?? [];
  const hasUnread = unreadNotifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
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
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={`/profile/${user.id}`}>
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
            {user.notifications && user.notifications.length > 0 ? (
              user.notifications.slice(0, 3).map(n => (
                <DropdownMenuItem key={n.id} className="flex items-start gap-2">
                  <div className="w-4 pt-1">
                    {!n.isRead && <span className="inline-flex rounded-full h-2 w-2 bg-primary"></span>}
                  </div>
                  <span className="flex-1 text-xs text-wrap">Notification {n.id.slice(0, 8)}</span>
                </DropdownMenuItem>
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
