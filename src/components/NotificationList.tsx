'use client';

import { HydratedNotification } from '@/lib/types';
import { NotificationCard } from './NotificationCard';
import { Button } from '@/components/ui/button';
import { markAllNotificationsAsRead } from '@/app/actions/notifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface NotificationListProps {
    notifications: HydratedNotification[];
}

export function NotificationList({ notifications: initialNotifications }: NotificationListProps) {
    const [notifications, setNotifications] = useState(initialNotifications);

    const handleMarkAllAsRead = async () => {
        const { success } = await markAllNotificationsAsRead();
        if (success) {
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        }
    };

    return (
        <div className="w-full md:w-96 bg-white rounded-lg shadow-lg">
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <Button variant="link" size="sm" onClick={handleMarkAllAsRead}>Mark all as read</Button>
            </div>
            <ScrollArea className="h-[400px]">
                {notifications.length > 0 ? (
                    <div>
                        {notifications.map(notification => (
                            <NotificationCard key={notification.id} notification={notification} />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>You have no notifications.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
