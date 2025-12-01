
import { HydratedProject, Tag, User } from "./types";

/**
 * Placeholder for a future real AI suggestion service.
 * @param projects - The projects to choose from.
 * @returns A promise that resolves to an array of AI-suggested projects.
 */
async function fetchAiSuggestions(projects: HydratedProject[]): Promise<HydratedProject[]> {
    // This is a placeholder. A real implementation would call an AI service.
    console.log("AI suggestions are enabled, but the service is not yet implemented.");
    return [];
}

/**
 * Generates a list of suggested projects for a user with a robust fallback system.
 *
 * @param allProjects - An array of all available hydrated projects.
 * @param currentUser - The user for whom to generate suggestions. Can be null for guests.
 * @param allTags - A list of all global tags (for potential future use).
 * @param dismissed - A boolean indicating if the user has dismissed suggestions.
 * @param aiEnabled - A boolean indicating if the AI suggestion feature is active.
 * @returns An array of 3 suggested projects, or null if no projects exist at all.
 */
export async function getSuggestedProjects(
    allProjects: HydratedProject[],
    currentUser: User | null,
    allTags: Tag[], // Kept for API consistency.
    dismissed: boolean,
    aiEnabled: boolean
): Promise<HydratedProject[] | null> {

    if (dismissed || !Array.isArray(allProjects) || allProjects.length === 0) {
        return null;
    }

    const validProjects = allProjects.filter(p => p && typeof p === 'object');
    if (validProjects.length === 0) {
        return null;
    }

    let suggestions: HydratedProject[] = [];
    const suggestionIds = new Set<string>();

    // For logged-in users, try personalized suggestions first.
    if (currentUser) {
        const nonMemberProjects = validProjects.filter(p => !p.team?.some(m => m.userId === currentUser.id));

        // 1. AI Suggestions
        if (aiEnabled) {
            const aiSuggestions = await fetchAiSuggestions(nonMemberProjects);
            for (const project of aiSuggestions) {
                if (suggestions.length < 3 && project && project.id && !suggestionIds.has(project.id)) {
                    suggestions.push(project);
                    suggestionIds.add(project.id);
                }
            }
        }

        // 2. Interest-based suggestions
        if (suggestions.length < 3) {
            const interests = (currentUser.interests || []).map(i => i.toLowerCase()).filter(Boolean);
            if (interests.length > 0) {
                const interestSet = new Set(interests);
                for (const project of nonMemberProjects) {
                    if (suggestions.length >= 3) break;
                    if (suggestionIds.has(project.id)) continue;

                    const projectText = [
                        project.name,
                        project.tagline,
                        project.description,
                        ...(project.tags || []).map(t => t.display),
                        ...(project.contributionNeeds || [])
                    ].join(' ').toLowerCase();

                    if (Array.from(interestSet).some(interest => projectText.includes(interest))) {
                        suggestions.push(project);
                        suggestionIds.add(project.id);
                    }
                }
            }
        }
    }

    // --- FALLBACK 1: Fill with random projects ---
    if (suggestions.length < 3) {
        let candidates = validProjects.filter(p => !suggestionIds.has(p.id) && !p.team?.some(m => m.userId === currentUser?.id));
        if (candidates.length < (3 - suggestions.length)) {
            candidates = validProjects.filter(p => !suggestionIds.has(p.id));
        }

        const shuffled = candidates.sort(() => 0.5 - Math.random());
        while (suggestions.length < 3 && shuffled.length > 0) {
            const candidate = shuffled.pop()!;
            suggestions.push(candidate);
            suggestionIds.add(candidate.id);
        }
    }

    // --- FALLBACK 2: Fill with most recent projects ---
    if (suggestions.length < 3) {
        const recentProjects = validProjects
            .filter(p => !suggestionIds.has(p.id))
            .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

        while (suggestions.length < 3 && recentProjects.length > 0) {
            const project = recentProjects.shift()!;
            suggestions.push(project);
            suggestionIds.add(project.id);
        }
    }

    return suggestions.slice(0, 3);
}
