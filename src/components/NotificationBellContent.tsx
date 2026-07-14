'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { HydratedNotification } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { NotificationList } from './NotificationList';

interface NotificationBellContentProps {
    notifications: HydratedNotification[];
}

export function NotificationBellContent({ notifications }: NotificationBellContentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close the popover whenever the route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 transform translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                    <span className="sr-only">View notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] md:w-96 p-0" align="end" sideOffset={8}>
                <NotificationList 
                    notifications={notifications} 
                    onItemClick={() => setIsOpen(false)} 
                />
            </PopoverContent>
        </Popover>
    );
}
