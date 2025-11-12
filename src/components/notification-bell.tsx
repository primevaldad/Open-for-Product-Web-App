
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getNotifications } from '@/app/actions/notifications';
import type { Notification } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper function to correctly handle Firestore Timestamps
function toDate(timestamp: number): Date {
    return new Date(timestamp);
  }

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      const result = await getNotifications();
      if (result.success && result.notifications) {
        setNotifications(result.notifications);
        setUnreadCount(result.notifications.filter(n => !n.read).length);
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll for new notifications every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
        <div className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount}
                </span>
            )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
        ) : (
          notifications.map(notification => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link href={notification.link ?? '#'} className={`block p-2 ${!notification.read ? 'font-bold' : ''}`}>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{toDate(notification.timestamp).toLocaleString()}</p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
