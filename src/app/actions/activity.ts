'use server';

import { getAuthenticatedUser } from "@/lib/session.server";
import { getUserActivity, getAllProjects, getAllUsers } from "@/lib/data.server";
import { toHydratedActivityItem } from "@/app/(app)/activity/utils";
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
            getAllProjects(),
            getAllUsers(),
        ]);

        const projectsMap = new Map(projects.map(p => [p.id, p]));
        const usersMap = new Map(users.map(u => [u.id, u]));

        const hydratedActivity = activity
            .map(item => toHydratedActivityItem(item, item.type, projectsMap, usersMap))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const userProjects = projects.filter(p => p.team.some(member => member.userId === currentUser.id));

        return deepSerialize({
            success: true,
            currentUser,
            activity: hydratedActivity,
            projects: userProjects,
            users,
        });
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "An unknown error occurred.";
        return deepSerialize({
            success: false,
            message: `Failed to load activity data: ${errorMessage}`,
        });
    }
}
