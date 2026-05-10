
import { notFound } from 'next/navigation';
import { 
    findProjectById, 
    getDiscussionsForProject, 
    findTasksByProjectId, 
    getAllUsers, 
    getRecommendedLearningPathsForProject,
    getPostsByProject
} from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import ProjectDetailClientPage from './project-detail-client-page';
import type { 
    User, 
    Discussion,
    HydratedProject,
    Task,
    LearningPath,
    Post
} from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

interface ProjectPageData {
    project: HydratedProject | null;
    discussions: (Discussion & { user?: User })[];
    tasks: Task[];
    posts: Post[];
    users: User[];
    currentUser: User | null;
    learningPaths: LearningPath[];
}

async function getProjectPageData(projectId: string): Promise<ProjectPageData> {
    const currentUser = await getAuthenticatedUser();
    const [project, discussions, tasks, posts, users] = await Promise.all([
        findProjectById(projectId, currentUser),
        getDiscussionsForProject(projectId),
        findTasksByProjectId(projectId),
        getPostsByProject(projectId),
        getAllUsers(),
    ]);

    if (!project) {
        return { project: null, discussions: [], tasks: [], posts: [], users: [], currentUser: null, learningPaths: [] };
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
        posts,
        users,
        currentUser: currentUser ?? null,
        learningPaths,
    };
}

export default async function ProjectPage({ params, searchParams }: { params: { id: string }, searchParams: { inviteToken?: string, tab?: string } }) {
    const data = await getProjectPageData(params.id);

    if (!data.project) {
        notFound();
    }

    const { 
        project, 
        discussions, 
        tasks, 
        posts,
        users, 
        currentUser, 
        learningPaths 
    } = data;

    return (
        <ProjectDetailClientPage
            project={deepSerialize(project)}
            discussions={deepSerialize(discussions)}
            tasks={deepSerialize(tasks)}
            posts={deepSerialize(posts)}
            users={deepSerialize(users)}
            currentUser={deepSerialize(currentUser)}
            learningPaths={deepSerialize(learningPaths)}
            inviteToken={searchParams.inviteToken}
            initialTab={searchParams.tab}
        />
    );
}
