import { getHydratedNotifications } from '@/app/actions/notifications';
import { NotificationBellContent } from './NotificationBellContent';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';

// This is a server component to fetch data
export async function NotificationBell() {
    try {
        const { notifications, error } = await getHydratedNotifications();

        if (error || !notifications) {
            console.error("Failed to fetch notifications:", error);
            return (
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                </Button>
            );
        }

        return <NotificationBellContent notifications={notifications} />;
    } catch (e) {
        return (
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="h-5 w-5 text-muted-foreground" />
            </Button>
        );
    }
}
