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

        const hydratedActivity = [
            ...activity.projects.map(item => toHydratedActivityItem(item, 'project', projectsMap, usersMap)),
            ...activity.tasks.map(item => toHydratedActivityItem(item, 'task', projectsMap, usersMap)),
            ...activity.discussions.map(item => toHydratedActivityItem(item, 'discussion', projectsMap, usersMap)),
            ...activity.notifications.map(item => toHydratedActivityItem(item, 'notification', projectsMap, usersMap)),
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const myTasks = activity.tasks
            .filter(task => task.assignedToId.includes(currentUser.id) || task.createdBy === currentUser.id)
            .map(task => toHydratedActivityItem(task, 'task', projectsMap, usersMap));

        const createdTasks = activity.tasks
            .filter(task => task.createdBy === currentUser.id)
            .map(task => toHydratedActivityItem(task, 'task', projectsMap, usersMap));

        const userProjects = projects.filter(p => p.team.some(member => member.userId === currentUser.id));

        return deepSerialize({
            success: true,
            currentUser,
            activity: hydratedActivity,
            myTasks,
            createdTasks,
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
