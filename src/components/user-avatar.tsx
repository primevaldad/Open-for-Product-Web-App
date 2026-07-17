import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { SteemLogo } from "./steem-logo";
import { cn, getInitials } from "@/lib/utils";
import type { User } from "@/lib/types";

interface UserAvatarProps {
  user: Partial<User>;
  className?: string;
  badgeSize?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, className, badgeSize = "sm" }: UserAvatarProps) {
  const badgeSizeClasses = {
    sm: "h-3 w-3 p-0.5",
    md: "h-4 w-4 p-0.5",
    lg: "h-8 w-8 p-1",
  };

  const badgeOffsetClasses = {
    sm: "-bottom-0.5 -right-0.5 border",
    md: "-bottom-0.5 -right-0.5 border-2",
    lg: "-bottom-1 -right-1 border-4",
  };

  return (
    <div className={cn("relative inline-block transform-gpu [transform:translateZ(0)] will-change-transform", className)}>
      <Avatar className={cn("h-full w-full", className)}>
        {(user.photoUrl || user.avatarUrl) && <AvatarImage src={user.photoUrl || user.avatarUrl} alt={user.name || user.username || 'User'} />}
        <AvatarFallback>
          <UserIcon className="h-1/2 w-1/2 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      {user.steemIconOverlay && (
        <div className={cn(
          "absolute bg-background rounded-full border-background shadow-sm flex items-center justify-center overflow-hidden",
          badgeSizeClasses[badgeSize],
          badgeOffsetClasses[badgeSize]
        )}>
          <SteemLogo className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
