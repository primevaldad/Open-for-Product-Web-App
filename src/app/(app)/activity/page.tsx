
import { getAuthenticatedUser } from "@/lib/session.server";
import { getUserActivity, getAllProjects, getAllUsers } from "@/lib/data.server";
import { ActivityClientPage } from "./activity-client-page";
import { updateTask, deleteTask } from "@/app/actions/projects";
import type { Task, Project, User } from "@/lib/types";
import { toHydratedActivityItem } from "./utils";

// A specific type for tasks enriched with project and user details
export type HydratedTask = Task & { 
    project?: { id: string, name: string }; 
    assignedUser?: { id: string, name: string | null, avatarUrl?: string | null };
};

async function getActivityPageData() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { 
        currentUser: null, 
        activity: { projects: [], tasks: [], discussions: [], notifications: [] },
        projects: [], 
        users: []
    };

    const [activity, projects, users] = await Promise.all([
        getUserActivity(currentUser.id),
        getAllProjects(),
        getAllUsers(),
    ]);

    return { currentUser, activity, projects, users };
}

export default async function ActivityPage() {
    const { currentUser, activity, projects, users } = await getActivityPageData();

    if (!currentUser) {
        // This could be a redirect to the login page as well
        return <p>Please log in to see your activity.</p>;
    }

    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const usersMap = new Map(users.map(u => [u.id, u]));

    const hydratedActivity = [
        ...activity.projects.map(item => toHydratedActivityItem(item, 'project', projectsMap, usersMap)),
        ...activity.tasks.map(item => toHydratedActivityItem(item, 'task', projectsMap, usersMap)),
        ...activity.discussions.map(item => toHydratedActivityItem(item, 'discussion', projectsMap, usersMap)),
        ...activity.notifications.map(item => toHydratedActivityItem(item, 'notification', projectsMap, usersMap)),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // My Tasks: tasks assigned to the current user
    const myTasks = activity.tasks
        .filter(task => task.assignee === currentUser.id)
        .map(task => toHydratedActivityItem(task, 'task', projectsMap, usersMap));

    // Created by Me: tasks where the current user is the creator
    const createdTasks = activity.tasks
        .filter(task => task.createdBy === currentUser.id)
        .map(task => toHydratedActivityItem(task, 'task', projectsMap, usersMap));

    const userProjects = projects.filter(p => p.team.some(member => member.userId === currentUser.id));

    return (
        <ActivityClientPage
            currentUser={currentUser}
            // @ts-ignore
            activity={hydratedActivity}
            myTasks={myTasks}
            createdTasks={createdTasks}
            projects={userProjects}
            users={users}
            updateTask={updateTask}
            deleteTask={deleteTask}
        />
    );
}
