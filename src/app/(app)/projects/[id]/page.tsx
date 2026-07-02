
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { 
    findProjectById, 
    getDiscussionsForProject, 
    findTasksByProjectId, 
    getAllUsers, 
    getRecommendedLearningPathsForProject,
    getPostsByProject,
    getChildProjects,
    getProjectActivityFeed
} from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { getPlatformConfigAction } from '@/app/actions/admin';
import ProjectDetailClientPage from './project-detail-client-page';
import type { 
    User, 
    Discussion,
    HydratedProject,
    Task,
    LearningPath,
    Post,
    Activity
} from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';
import { extractId } from '@/lib/slug';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const cleanId = extractId(params.id);
    const project = await findProjectById(cleanId, null);
    if (!project) return { title: 'Project Not Found | Open for Product' };
    return {
        title: `Project - ${project.name} | Open for Product`,
        description: project.description,
    };
}

interface ProjectPageData {
    project: HydratedProject | null;
    discussions: (Discussion & { user?: User })[];
    tasks: Task[];
    posts: Post[];
    users: User[];
    currentUser: User | null;
    learningPaths: LearningPath[];
    childProjects: HydratedProject[];
    activities: Activity[];
    isQueenEnabled: boolean;
}

async function getProjectPageData(projectId: string, inviteToken?: string): Promise<ProjectPageData> {
    const cleanId = extractId(projectId);
    const currentUser = await getAuthenticatedUser();
    const [project, discussions, tasks, posts, users, childProjects, activities, configRes] = await Promise.all([
        findProjectById(cleanId, currentUser),
        getDiscussionsForProject(cleanId),
        findTasksByProjectId(cleanId),
        getPostsByProject(cleanId),
        getAllUsers(),
        getChildProjects(cleanId),
        getProjectActivityFeed(cleanId),
        getPlatformConfigAction()
    ]);

    if (!project) {
        return { project: null, discussions: [], tasks: [], posts: [], users: [], currentUser: null, learningPaths: [], childProjects: [], activities: [], isQueenEnabled: false };
    }

    // Check project visibility access
    const projectType = project.project_type || 'public';
    let hasAccess = false;

    if (projectType === 'public') {
        hasAccess = true;
    } else if (projectType === 'private') {
        const isMember = currentUser && project.team.some(member => member.userId === currentUser.id);
        hasAccess = !!isMember;
    } else if (projectType === 'personal') {
        const isOwner = currentUser && project.owner?.id === currentUser.id;
        hasAccess = !!isOwner;
    }

    // Bypass if there is a valid invite token
    if (!hasAccess && inviteToken) {
        const { adminDb } = await import('@/lib/data.server');
        const inviteQuery = await adminDb.collection('projectInvites')
            .where('projectId', '==', cleanId)
            .where('token', '==', inviteToken)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        if (!inviteQuery.empty) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        return { project: null, discussions: [], tasks: [], posts: [], users: [], currentUser: null, learningPaths: [], childProjects: [], activities: [], isQueenEnabled: false };
    }

    const learningPaths = await getRecommendedLearningPathsForProject(project);
    const usersMap = new Map(users.map((user) => [user.id, user]));

    const hydratedDiscussions = discussions.map(discussion => {
        const user = usersMap.get(discussion.userId);
        return { ...discussion, user: user || null };
    }).filter(d => d.user); // Ensure user is not null

    const isMember = currentUser && (
        currentUser.role === 'admin' ||
        project.team?.some(member => member.userId === currentUser.id) ||
        project.owner?.id === currentUser.id
    );

    const filteredPosts = isMember
        ? posts
        : posts.filter(post => post.status !== 'draft');

    console.log('[SERVER] ProjectPage:', {
        currentUserId: currentUser?.id,
        currentUserRole: currentUser?.role,
        isMember,
        allPostsCount: posts.length,
        filteredPostsCount: filteredPosts.length
    });

    return {
        project,
        discussions: hydratedDiscussions as (Discussion & { user: User })[],
        tasks,
        posts: filteredPosts,
        users,
        currentUser: currentUser ?? null,
        learningPaths,
        childProjects,
        activities,
        isQueenEnabled: configRes.success && configRes.data?.defaultFeaturesEnabled?.queen ? true : false,
    };
}

export default async function ProjectPage({ params, searchParams }: { params: { id: string }, searchParams: { inviteToken?: string, tab?: string } }) {
    const cleanId = extractId(params.id);
    const data = await getProjectPageData(cleanId, searchParams.inviteToken);

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
        learningPaths,
        childProjects,
        activities,
        isQueenEnabled
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
            childProjects={deepSerialize(childProjects)}
            activities={deepSerialize(activities)}
            isQueenEnabled={isQueenEnabled}
            inviteToken={searchParams.inviteToken}
            initialTab={searchParams.tab}
        />
    );
}
