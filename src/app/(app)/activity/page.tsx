import { redirect } from 'next/navigation';
import { getActivityPageData } from "@/app/actions/activity";
import { ActivityClientPage } from "./activity-client-page";
import { User, HydratedProject } from '@/lib/types'; // Import necessary types
import { HydratedActivityItem } from './utils';
/**
 * ActivityPage is the primary server component for the activity feed.
 * It fetches all necessary data on the server and then passes it down to the
 * client component for rendering.
 */
export default async function ActivityPage() {
    // Fetch data on the server using our server action.
    const response = await getActivityPageData();

    // Handle unauthenticated users or other errors by redirecting.
    if (!response.success) {
        if ((response as { success: false; message: string }).message === "User not authenticated.") {
            redirect('/login');
        }
        // Render a simple error message for other failures.
        return <div className="flex h-screen items-center justify-center"><p>{(response as { success: false; message: string }).message}</p></div>;
    }

    // If data fetching is successful, pass the hydrated activity data to the client component.
    const successfulResponse = response as { success: true; currentUser: User; activity: HydratedActivityItem[]; projects: HydratedProject[]; users: User[]; };
    return (
        <ActivityClientPage
            activity={successfulResponse.activity}
            currentUser={successfulResponse.currentUser}
            projects={successfulResponse.projects}
            users={successfulResponse.users}
        />
    );
}