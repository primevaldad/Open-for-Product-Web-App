'use server';

import {                  
    getAllPublishedProjects,
    getAllTags as getAllGlobalTags, 
    getAllLearningPaths, 
    getAllProjectPathLinks
} from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { HomePageData, HomePageDataResponse } from "@/lib/types";
import { getSuggestedProjects } from "@/lib/suggestions";
import { deepSerialize } from "@/lib/utils.server";
import { cookies } from 'next/headers';

export async function getHomePageData(): Promise<HomePageDataResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        const [projects, allTags, allLearningPaths, allProjectPathLinks] = await Promise.all([
            getAllPublishedProjects(),
            getAllGlobalTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        const aiEnabled = !!process.env.OPENAI_API_KEY;

        const suggestedProjects = await getSuggestedProjects(projects, currentUser, allTags.tags, cookies().get('suggested-projects-dismissed')?.value === 'true');

        const pageData: HomePageData = {
            allPublishedProjects: projects,
            currentUser,
            allTags: allTags.tags,
            allLearningPaths: allLearningPaths.paths,
            allProjectPathLinks,
            suggestedProjects,
            aiEnabled,
        };

        return deepSerialize({ success: true, ...pageData });

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error('Error fetching home page data:', e);
        return deepSerialize({ 
            success: false, 
            error: errorMessage
        });
    }
}
