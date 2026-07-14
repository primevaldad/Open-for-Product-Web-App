import { getHydratedNotifications } from '@/app/actions/notifications';
import { NotificationBellContent } from './NotificationBellContent';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

// This is a server component to fetch data
export async function NotificationBell() {
    try {
        const { notifications, error, success } = await getHydratedNotifications();

        if (!success || !notifications) {
            console.error("Failed to fetch notifications. This is usually due to a missing Firestore index. Check the error details below:");
            console.error(error);
            // Return a version that can show the error or just a disabled bell
            return (
                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground opacity-50 cursor-not-allowed">
                    <Bell className="h-5 w-5" />
                    <AlertCircle className="absolute -top-1 -right-1 h-3 w-3 text-destructive" />
                </Button>
            );
        }

        return <NotificationBellContent notifications={notifications} />;
    } catch (e) {
        console.error("Fatal error in NotificationBell:", e);
        return (
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground opacity-50">
                <Bell className="h-5 w-5" />
                <AlertCircle className="absolute -top-1 -right-1 h-3 w-3 text-destructive" />
            </Button>
        );
    }
}
