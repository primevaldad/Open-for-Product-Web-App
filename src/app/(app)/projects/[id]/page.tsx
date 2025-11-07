import { notFound } from 'next/navigation';
import { 
    findProjectById, 
    getDiscussionsForProject, 
    findTasksByProjectId, 
    getAllUsers, 
    getRecommendedLearningPathsForProject 
} from '@/lib/data.server';
import { getCurrentUser } from '@/lib/session.server';
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
    User, 
    Discussion,
    HydratedProject,
    Task,
    LearningPath,
    JoinProjectAction,
    AddTeamMemberAction,
    AddDiscussionCommentAction,
    AddTaskAction,
    UpdateTaskAction,
    DeleteTaskAction
} from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

interface ProjectPageData {
    project: HydratedProject | null;
    discussions: (Discussion & { user?: User })[];
    tasks: Task[];
    users: User[];
    currentUser: User | null;
    learningPaths: LearningPath[];
}

async function getProjectPageData(projectId: string): Promise<ProjectPageData> {
    const [project, discussions, tasks, users, currentUser] = await Promise.all([
        findProjectById(projectId),
        getDiscussionsForProject(projectId),
        findTasksByProjectId(projectId),
        getAllUsers(),
        getCurrentUser(),
    ]);

    if (!project) {
        return { project: null, discussions: [], tasks: [], users: [], currentUser: null, learningPaths: [] };
    }

    const learningPaths = await getRecommendedLearningPathsForProject(project);
    const usersMap = new Map(users.map((user) => [user.id, user]));

    const hydratedDiscussions = discussions.map(discussion => {
        const user = usersMap.get(discussion.userId);
        return { ...discussion, user: user || null };
    }).filter(d => d.user); // Ensure user is not null

    return {
        project,
        discussions: hydratedDiscussions as (Discussion & { user: User })[],
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
            joinProject={joinProject}
            addTeamMember={addTeamMember}
            addDiscussionComment={addDiscussionComment}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
        />
    );
}
