
import { HydratedProject, Tag, User } from "./types";

/**
 * Filters and returns a list of suggested projects for a user.
 *
 * This implementation suggests projects based on a user's interests.
 * It matches interests against project tags, names, and descriptions to provide more relevant results.
 *
 * @param allProjects - A list of all available hydrated projects.
 * @param currentUser - The user for whom to generate suggestions. Can be null.
 * @param allTags - A list of all global tags (not used in this version, but available for future use).
 * @param dismissed - A boolean indicating if the user has dismissed suggestions.
 * @returns An array of suggested projects, or null if suggestions are dismissed or not applicable.
 */
export async function getSuggestedProjects(
    allProjects: HydratedProject[],
    currentUser: User | null,
    allTags: Tag[],
    dismissed: boolean
): Promise<HydratedProject[] | null> {

    // If the user has dismissed suggestions, don't show any.
    if (dismissed) {
        return null;
    }

    // Suggestions require a logged-in user and a list of projects.
    if (!currentUser || allProjects.length === 0) {
        return null;
    }

    // Filter out projects the user is already a member of.
    const nonMemberProjects = allProjects.filter(project =>
        !project.team.some(member => member.userId === currentUser.id)
    );

    // If the user has defined interests, try to find projects that match them.
    const userInterests = currentUser.interests;
    if (userInterests && userInterests.length > 0) {
        const interestSet = new Set(userInterests.map(i => i.toLowerCase()));
        
        const suggested = nonMemberProjects.filter(project => {
            // Match 1: Project tags
            if (Array.isArray(project.tags) && project.tags.some(tag => interestSet.has(tag.display.toLowerCase()))) {
                return true;
            }

            // Match 2: Project name or description
            const searchText = `${project.name} ${project.description || ''}`.toLowerCase();
            for (const interest of interestSet) {
                if (searchText.includes(interest)) {
                    return true;
                }
            }

            return false;
        });

        if (suggested.length > 0) {
            // Return up to 3 interest-based suggestions, sorted by most recent.
            return suggested
                .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime())
                .slice(0, 3);
        }
    }

    // Fallback: If no interests match, suggest 3 random projects the user isn't on.
    const shuffled = nonMemberProjects.sort(() => 0.5 - Math.random());
    const fallbackSuggestions = shuffled.slice(0, 3);

    return fallbackSuggestions.length > 0 ? fallbackSuggestions : null;
}
