'use client';

import Link from 'next/link';

import { HydratedNotification } from '@/lib/types';
import { NotificationCard } from './NotificationCard';
import { Button } from '@/components/ui/button';
import { markAllNotificationsAsRead } from '@/app/actions/notifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';

interface NotificationListProps {
    notifications: HydratedNotification[];
    onItemClick?: () => void;
}

export function NotificationList({ 
    notifications: initialNotifications,
    onItemClick 
}: NotificationListProps) {
    const [notifications, setNotifications] = useState(initialNotifications);
    
    // Sync state if props change (e.g. new notifications arrive)
    useEffect(() => {
        setNotifications(initialNotifications);
    }, [initialNotifications]);

    const handleMarkAllAsRead = async () => {
        const { success } = await markAllNotificationsAsRead();
        if (success) {
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <Button variant="link" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            </div>
            <ScrollArea className="h-[400px]">
                {notifications.length > 0 ? (
                    <div className="divide-y">
                        {notifications.map(notification => (
                            <NotificationCard 
                                key={notification.id} 
                                notification={notification} 
                                onClick={() => onItemClick?.()}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>You have no notifications.</p>
                    </div>
                )}
            </ScrollArea>
            <div className="p-2 border-t text-center">
                <Link 
                    href="/feed" 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => onItemClick?.()}
                >
                    See all activity
                </Link>
            </div>
        </div>
    );
}
