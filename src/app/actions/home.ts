
'use server';

import {
    getAllPublishedProjects,
    getAllTags as getAllGlobalTags,
    getAllLearningPaths,
    getAllProjectPathLinks
} from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { HomePageData, HomePageDataResponse, Tag, HydratedProject } from "@/lib/types";
import { getSuggestedProjects } from "@/lib/suggestions";
import { cookies } from 'next/headers';

// Helper function to convert Firestore Timestamps in a project to ISO strings
const convertProjectTimestamps = (project: HydratedProject): HydratedProject => {
    if (!project) return project;

    const newProject = { ...project };

    // Safely convert a value to an ISO string if it's a Timestamp object
    const toISO = (date: any): string | any => {
        if (date && typeof date.toDate === 'function') {
            return date.toDate().toISOString();
        }
        return date; // Return as is if it's already a string or not a Timestamp
    };

    newProject.createdAt = toISO(newProject.createdAt);
    newProject.updatedAt = toISO(newProject.updatedAt);
    newProject.startDate = toISO(newProject.startDate);
    newProject.endDate = toISO(newProject.endDate);

    return newProject;
};


export async function getHomePageData(): Promise<HomePageDataResponse> {
    try {
        const currentUser = await getAuthenticatedUser();
        const [projects, allTags, learningPathsResponse, allProjectPathLinks] = await Promise.all([
            getAllPublishedProjects(),
            getAllGlobalTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        const cookieStore = await cookies();
        const aiEnabled = cookieStore.get('ai-enabled')?.value === 'true' || false;

        const suggestedProjects = await getSuggestedProjects(projects, currentUser, allTags, false, aiEnabled);

        // Convert timestamps to strings for serialization before passing to the client
        const serializedProjects = projects.map(convertProjectTimestamps);
        const serializedSuggestedProjects = suggestedProjects 
            ? suggestedProjects.map(convertProjectTimestamps) 
            : null;

        const pageData: HomePageData = {
            allPublishedProjects: serializedProjects,
            currentUser,
            allTags: allTags,
            allLearningPaths: learningPathsResponse.paths,
            allProjectPathLinks,
            suggestedProjects: serializedSuggestedProjects,
            aiEnabled,
        };

        return { success: true, ...pageData };

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        console.error('Error fetching home page data:', e);
        
        return {
            success: false,
            error: errorMessage,
        };
    }
}
