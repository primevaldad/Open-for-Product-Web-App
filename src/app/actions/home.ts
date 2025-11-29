'use server';

import {
    getAllPublishedProjects,
    getAllTags as getAllGlobalTags, 
    getAllLearningPaths, 
    getAllProjectPathLinks
} from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { HomePageData, HomePageDataResponse, Tag } from "@/lib/types";
import { getSuggestedProjects } from "@/lib/suggestions";
import { deepSerialize } from "@/lib/utils.server";
import { cookies } from 'next/headers';

export async function getHomePageData(): Promise<HomePageDataResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        const [projectsResponse, tagsResponse, learningPathsResponse, projectPathLinksResponse] = await Promise.all([
            getAllPublishedProjects(),
            getAllGlobalTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        // Ensure all data is properly formed, defaulting to empty arrays to prevent downstream errors.
        const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
        const allTags = Array.isArray(tagsResponse) ? tagsResponse : [];
        const allLearningPaths = (learningPathsResponse && Array.isArray(learningPathsResponse.paths)) ? learningPathsResponse.paths : [];
        const allProjectPathLinks = Array.isArray(projectPathLinksResponse) ? projectPathLinksResponse : [];

        const aiEnabled = !!process.env.OPENAI_API_KEY;
        const suggestionsDismissed = cookies().get('suggested-projects-dismissed')?.value === 'true';

        const suggestedProjects = await getSuggestedProjects(
            projects,
            currentUser,
            allTags,
            aiEnabled ? suggestionsDismissed : false // Ignore dismissal if AI is off and we are using fallback
        );

        const pageData: HomePageData = {
            allPublishedProjects: projects,
            currentUser,
            allTags: allTags,
            allLearningPaths: allLearningPaths,
            allProjectPathLinks,
            suggestedProjects,
            aiEnabled,
        };

        return deepSerialize({ success: true, ...pageData });

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error('Error fetching home page data:', e);
        // On error, return a fully formed, empty state to prevent the client from crashing.
        return deepSerialize({ 
            success: false, 
            error: errorMessage,
            allPublishedProjects: [],
            currentUser: null,
            allTags: [],
            allLearningPaths: [],
            allProjectPathLinks: [],
            suggestedProjects: [],
            aiEnabled: false,
        });
    }
}
