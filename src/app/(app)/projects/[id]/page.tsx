
import { notFound } from 'next/navigation';
import { findProjectById, getDiscussionsForProject, getAllTasks, getAllUsers } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import ProjectDetailClientPage from './project-detail-client-page';
import {
    joinProject, 
    addTeamMember, 
    addDiscussionComment,
    addTask,
    updateTask,
    deleteTask
} from '@/app/actions/projects';
import type { 
    HydratedProject, 
    User, 
    HydratedProjectMember,
    Discussion,
    Task,
    ServerActionResponse,
    ProjectMember
} from '@/lib/types';
import { toHydratedProject, deepSerialize } from '@/lib/utils';
import { getRecommendedLearningPathsForProject } from '@/lib/data.server';

// Action type definitions, ensuring they match the client component's expectations
type JoinProjectAction = (projectId: string) => Promise<ServerActionResponse<HydratedProjectMember>>;
type AddTeamMemberAction = (data: { projectId: string; userId: string; role: ProjectMember['role'] }) => Promise<ServerActionResponse<HydratedProjectMember>>;
type AddDiscussionCommentAction = (data: { projectId: string; userId: string; content: string }) => Promise<ServerActionResponse<Discussion>>;
type AddTaskAction = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ServerActionResponse<Task>>;
type UpdateTaskAction = (data: Task) => Promise<ServerActionResponse<Task>>;
type DeleteTaskAction = (data: { id: string; projectId: string }) => Promise<ServerActionResponse<{}>>;


async function getProjectPageData(projectId: string) {
    const [project, discussions, tasks, users, currentUser, learningPaths] = await Promise.all([
        findProjectById(projectId),
        getDiscussionsForProject(projectId),
        getAllTasks(projectId),
        getAllUsers(),
        getAuthenticatedUser(),
        getRecommendedLearningPathsForProject(projectId)
    ]);

    if (!project) {
        return { project: null };
    }

    const usersMap = new Map(users.map((user) => [user.id, user]));
    const hydratedProject = toHydratedProject(project, usersMap);

    // Hydrate discussions with user info
    const hydratedDiscussions = discussions.map(discussion => {
        const user = usersMap.get(discussion.userId);
        return { ...discussion, user };
    });

    return {
        project: hydratedProject,
        discussions: hydratedDiscussions,
        tasks,
        users,
        currentUser,
        learningPaths,
    };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
    const data = await getProjectPageData(params.id);

    if (!data.project) {
        notFound();
    }

    const { 
        project, 
        discussions, 
        tasks, 
        users, 
        currentUser, 
        learningPaths 
    } = data;

    return (
        <ProjectDetailClientPage
            project={deepSerialize(project)}
            discussions={deepSerialize(discussions)}
            tasks={deepSerialize(tasks)}
            users={deepSerialize(users)}
            currentUser={deepSerialize(currentUser)}
            learningPaths={deepSerialize(learningPaths)}
            // Pass the server actions directly to the client component
            joinProject={joinProject as JoinProjectAction}
            addTeamMember={addTeamMember as AddTeamMemberAction}
            addDiscussionComment={addDiscussionComment as AddDiscussionCommentAction}
            addTask={addTask as AddTaskAction}
            updateTask={updateTask as UpdateTaskAction}
            deleteTask={deleteTask as DeleteTaskAction}
        />
    );
}
