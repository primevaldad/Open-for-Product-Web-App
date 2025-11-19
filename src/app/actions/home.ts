
'use server';

import { getAuthenticatedUser } from '@/lib/session.server';
import { 
    getAllProjects, 
    getAllTags, 
    getAllLearningPaths, 
    getAllProjectPathLinks, 
    getAiSuggestedProjects 
} from '@/lib/data.server';
import type { HydratedProject, User, HomePageDataResponse, Tag, ProjectTag } from '@/lib/types';
import { NotAuthenticatedError } from '@/lib/errors';
import { toHydratedProject } from '@/lib/utils.server';

// The user object can contain non-serializable data (like functions) when coming from the DB.
// This helper removes them to avoid errors when passing data from Server Components to Client Components.
function cleanUser(user: User): User {
    const { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt } = user;
    return { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt };
}

export async function getHomePageData(): Promise<HomePageDataResponse> {
    try {
        const currentUser = await getAuthenticatedUser();

        // Fetch all necessary data in parallel
        const [projectsData, tagsData, learningPathsResult, projectPathLinksData] = await Promise.all([
            getAllProjects(),
            getAllTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        const tagsMap = new Map<string, Tag>();
        tagsData.forEach((tag) => tagsMap.set(tag.id, tag));

        const allPublishedProjects: HydratedProject[] = projectsData.map(project => {
            if (project.tags && Array.isArray(project.tags)) {
                const hydratedTags: ProjectTag[] = project.tags.map(projectTag => {
                    const globalTag = tagsMap.get(projectTag.id);
                    return {
                        id: projectTag.id,
                        display: globalTag?.display || projectTag.display,
                        isCategory: projectTag.isCategory || false,
                    };
                });
                project.tags = hydratedTags;
            }
            return project as HydratedProject;
        });

        // Get AI-suggested projects if the user is logged in
        const suggestedProjects = currentUser
            ? await getAiSuggestedProjects(currentUser, allPublishedProjects)
            : null;
        
        const aiEnabled = process.env.AI_SUGGESTIONS_ENABLED === 'true' && currentUser?.aiFeaturesEnabled === true;

        return {
            success: true,
            allPublishedProjects: allPublishedProjects,
            currentUser: currentUser ? cleanUser(currentUser) : null,
            allTags: tagsData,
            allLearningPaths: learningPathsResult.paths,
            allProjectPathLinks: projectPathLinksData,
            suggestedProjects: suggestedProjects,
            aiEnabled: aiEnabled,
        };
    } catch (error) {
        console.error('Error fetching home page data:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred while fetching home page data.',
        };
    }
}
