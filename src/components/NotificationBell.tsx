
import { getHydratedNotifications } from '@/app/actions/notifications';
import { NotificationBellContent } from './NotificationBellContent';

// This is a server component to fetch data
export async function NotificationBell() {
    const { notifications, error } = await getHydratedNotifications();

    if (error || !notifications) {
        // Silently fail for now, maybe add logging later
        console.error("Failed to fetch notifications:", error);
        return null; 
    }

    return <NotificationBellContent notifications={notifications} />;
}
