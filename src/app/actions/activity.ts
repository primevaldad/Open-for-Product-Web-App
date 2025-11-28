'use server';

import { getAuthenticatedUser } from "@/lib/session.server";
import { getUserActivity, getAllProjects, getAllUsers } from "@/lib/data.server";
import { hydrateActivityItem } from "@/app/(app)/activity/utils";
import { deepSerialize } from "@/lib/utils.server";

export async function getActivityPageData() {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return deepSerialize({ 
                success: false, 
                message: "User not authenticated."
            });
        }

        const [activity, projects, users] = await Promise.all([
            getUserActivity(currentUser.id),
            getAllProjects(currentUser),
            getAllUsers(),
        ]);

        const projectsMap = new Map(projects.map(p => [p.id, p]));
        const usersMap = new Map(users.map(u => [u.id, u]));

        const hydratedActivity = activity
            .map(item => hydrateActivityItem(item, usersMap, projectsMap))
            .filter(Boolean); // Filter out any null results from hydration

        return deepSerialize({
            success: true,
            activity: hydratedActivity,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return deepSerialize({ success: false, message });
    }
}
