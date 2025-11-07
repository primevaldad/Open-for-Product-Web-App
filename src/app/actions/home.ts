'use server';

import { getCurrentUser } from '@/lib/session.server';
import { 
    getAllProjects, 
    getAllTags, 
    getAllLearningPaths, 
    getAllProjectPathLinks, 
    getAiSuggestedProjects 
} from '@/lib/data.server';
import type { HydratedProject, User } from '@/lib/types';

// The user object can contain non-serializable data (like functions) when coming from the DB.
// This helper removes them to avoid errors when passing data from Server Components to Client Components.
function cleanUser(user: User): User {
    const { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt } = user;
    return { id, name, email, role, username, avatarUrl, bio, website, onboardingCompleted, aiFeaturesEnabled, createdAt, updatedAt };
}

export async function getHomePageData() {
    try {
        // 1. Get the current user and fetch all necessary data in parallel
        const [currentUser, projectsData, tagsData, learningPathsResult, projectPathLinksData] = await Promise.all([
            getCurrentUser(),
            getAllProjects(),
            getAllTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        // 2. The `getAllProjects` function already returns fully hydrated projects.
        // The previous manual hydration was redundant and caused the crash. We can use the data directly.
        const allPublishedProjects: HydratedProject[] = projectsData;

        // 3. Get AI-suggested projects if the user is logged in
        const suggestedProjects = currentUser
            ? await getAiSuggestedProjects(currentUser, allPublishedProjects)
            : null;
        
        const aiEnabled = process.env.AI_SUGGESTIONS_ENABLED === 'true' && currentUser?.aiFeaturesEnabled === true;

        // 4. Return the data in the success shape the client now expects
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
        // 5. Return the error shape the client now expects
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred while fetching home page data.',
        };
    }
}
