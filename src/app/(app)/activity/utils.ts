
import type { Project, Task, Discussion, Notification, User, ServerActionResponse, HydratedTask } from '@/lib/types';

export type HydratedActivityItem = {
    id: string;
    type: 'project' | 'task' | 'discussion' | 'notification';
    timestamp: Date;
    content: Project | Task | Discussion | Notification;
    project?: { id: string, name: string };
    user?: { id: string, name: string | null, avatarUrl?: string | null };
};

export const toHydratedActivityItem = (
    item: Project | Task | Discussion | Notification,
    type: 'project' | 'task' | 'discussion' | 'notification',
    projects: Map<string, Project>,
    users: Map<string, User>
): HydratedActivityItem => {
    let timestamp: Date;
    let projectId: string | undefined;
    let userId: string | undefined;

    if (type === 'project') {
        const project = item as Project;
        timestamp = new Date(project.createdAt as string);
        projectId = project.id;
        userId = project.ownerId;
    } else if (type === 'task') {
        const task = item as Task;
        timestamp = new Date(task.createdAt as string);
        projectId = task.projectId;
        userId = task.createdBy;
    } else if (type === 'discussion') {
        const discussion = item as Discussion;
        timestamp = new Date(discussion.timestamp as string);
        projectId = discussion.projectId;
        userId = discussion.userId;
    } else {
        const notification = item as Notification;
        timestamp = new Date(notification.timestamp as string);
        userId = notification.userId;
    }

    const project = projectId ? projects.get(projectId) : undefined;
    const user = userId ? users.get(userId) : undefined;

    return {
        id: item.id,
        type,
        timestamp,
        content: item,
        project: project ? { id: project.id, name: project.name } : undefined,
        user: user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : undefined,
    };
};

// Define Action Prop Types
type UpdateTaskAction = (values: Task) => Promise<ServerActionResponse<Task>>;
type DeleteTaskAction = (values: { id: string, projectId: string }) => Promise<ServerActionResponse<{}>>;

export interface ActivityClientPageProps {
    currentUser: User;
    myTasks: HydratedTask[];
    createdTasks: HydratedTask[];
    projects: Project[];
    users: User[];
    updateTask: UpdateTaskAction;
    deleteTask: DeleteTaskAction;
}

export { HydratedTask };
