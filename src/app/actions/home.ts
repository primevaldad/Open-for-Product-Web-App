
'use server';

import { getAuthenticatedUser } from '@/lib/session.server';
import { 
    getAllProjects, 
    getAllTags, 
    getAllLearningPaths, 
    getAllProjectPathLinks, 
    getAiSuggestedProjects, 
    getAllUsers
} from '@/lib/data.server';
import type { HydratedProject, User, HomePageDataResponse } from '@/lib/types';
import { toHydratedProject } from '@/lib/utils.server';

function cleanUser(user: User): User {
    const { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt } = user;
    return { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt };
}

export async function getHomePageData(): Promise<HomePageDataResponse> {
    try {
        const currentUser = await getAuthenticatedUser();

        const [projectsData, tagsData, learningPathsResult, projectPathLinksData, usersData] = await Promise.all([
            getAllProjects(currentUser),
            getAllTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
            getAllUsers(),
        ]);

        const usersMap = new Map(usersData.map((user) => [user.id, user]));

        const allPublishedProjects: HydratedProject[] = projectsData
            .filter(p => p.status === 'published')
            .map(p => toHydratedProject(p, usersMap));

        const suggestedProjects = currentUser
            ? await getAiSuggestedProjects(currentUser, allPublishedProjects)
            : null;
        
        const aiEnabled = process.env.AI_SUGGESTIONS_ENABLED === 'true' && currentUser?.aiFeaturesEnabled === true;

        return {
            success: true,
            allPublishedProjects,
            currentUser: currentUser ? cleanUser(currentUser) : null,
            allTags: tagsData,
            allLearningPaths: learningPathsResult.paths,
            allProjectPathLinks: projectPathLinksData,
            suggestedProjects,
            aiEnabled,
        };
    } catch (error) {
        console.error('Error fetching home page data:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return {
            success: false,
            message: `Failed to fetch home page data: ${message}`,
        };
    }
}
