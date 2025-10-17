
import { getAuthenticatedUser } from "@/lib/session.server";
import { getAllProjects, getAllTasks, getAllUsers } from "@/lib/data.server";
import { ActivityClientPage } from "./activity-client-page";
import { updateTask, deleteTask } from "@/app/actions/projects";
import type { Task, Project, User } from "@/lib/types";

// A specific type for tasks enriched with project and user details
export type HydratedTask = Task & { 
    project?: { id: string, name: string }; 
    assignedUser?: { id: string, name: string | null, avatarUrl?: string | null };
};

async function getActivityPageData() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return { 
        currentUser: null, 
        tasks: [], 
        projects: [], 
        users: []
    };

    const [tasks, projects, users] = await Promise.all([
        getAllTasks(),
        getAllProjects(),
        getAllUsers(),
    ]);

    return { currentUser, tasks, projects, users };
}

// This function runs on the server to prepare serializable props for the client
const toSerializableHydratedTask = (task: Task, projects: Map<string, Project>, users: Map<string, User>): HydratedTask => {
    const project = projects.get(task.projectId);
    const assignedUser = task.assignedToId ? users.get(task.assignedToId) : undefined;

    return {
        ...task,
        // Ensure timestamps are ISO strings for serialization
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : new Date().toISOString(),
        project: project ? { id: project.id, name: project.name } : undefined,
        assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, avatarUrl: assignedUser.avatarUrl } : undefined,
    };
};

export default async function ActivityPage() {
    const { currentUser, tasks, projects, users } = await getActivityPageData();

    if (!currentUser) {
        // This could be a redirect to the login page as well
        return <p>Please log in to see your activity.</p>;
    }

    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const usersMap = new Map(users.map(u => [u.id, u]));

    // My Tasks: tasks assigned to the current user
    const myTasks = tasks
        .filter(task => task.assignedToId === currentUser.id)
        .map(task => toSerializableHydratedTask(task, projectsMap, usersMap));

    // Created by Me: tasks where the current user is part of the project team
    const createdByMeProjects = projects.filter(p => p.team.some(member => member.userId === currentUser.id));
    const createdByMeProjectIds = new Set(createdByMeProjects.map(p => p.id));
    const createdTasks = tasks
        .filter(task => createdByMeProjectIds.has(task.projectId))
        .map(task => toSerializableHydratedTask(task, projectsMap, usersMap));

    const userProjects = projects.filter(p => p.team.some(member => member.userId === currentUser.id));

    return (
        <ActivityClientPage
            currentUser={currentUser}
            myTasks={myTasks}
            createdTasks={createdTasks}
            projects={userProjects}
            users={users}
            updateTask={updateTask}
            deleteTask={deleteTask}
        />
    );
}
