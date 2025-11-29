'use server';

import { getAuthenticatedUser } from "@/lib/session.server";
import { getUserActivity, getAllProjects, getAllUsers } from "@/lib/data.server";
import { hydrateActivityItem } from "@/app/(app)/activity/utils";
import { deepSerialize } from "@/lib/utils.server";
import { HydratedActivityItem } from "@/app/(app)/activity/utils";

export async function getActivityPageData() {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return deepSerialize({ 
                success: false, 
                error: "User not authenticated."
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
            .filter((item): item is HydratedActivityItem => !!item); // Ensure we have a correctly typed array

        return deepSerialize({
            success: true,
            currentUser,
            activity: hydratedActivity,
            projects,
            users,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return deepSerialize({ success: false, error: message });
    }
}
