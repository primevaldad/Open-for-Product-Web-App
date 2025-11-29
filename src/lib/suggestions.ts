
import { HydratedProject, Tag, User } from "./types";

/**
 * Filters and returns a list of suggested projects for a user.
 *
 * This function is designed with high defensiveness to prevent crashes from malformed data.
 * It first tries to match projects based on the user's interests, and falls back to random suggestions.
 *
 * @param allProjects - An array of all available hydrated projects, which may contain invalid entries.
 * @param currentUser - The user for whom to generate suggestions. Can be null.
 * @param allTags - A list of all global tags (for potential future use).
 * @param dismissed - A boolean indicating if the user has dismissed suggestions.
 * @returns An array of up to 3 suggested projects, or null if no suggestions can be made.
 */
export async function getSuggestedProjects(
    allProjects: HydratedProject[],
    currentUser: User | null,
    allTags: Tag[],
    dismissed: boolean
): Promise<HydratedProject[] | null> {

    if (dismissed || !currentUser || !Array.isArray(allProjects) || allProjects.length === 0) {
        return null;
    }

    // 1. Defensively clean the projects list to remove any null, undefined, or non-object entries.
    const validProjects = allProjects.filter(p => p && typeof p === 'object');

    // 2. Filter out projects the user is already a member of.
    const nonMemberProjects = validProjects.filter(project => 
        !Array.isArray(project.team) || !project.team.some(member => member && member.userId === currentUser.id)
    );

    // 3. Try to suggest projects based on the user's interests.
    const userInterests = currentUser.interests;
    if (Array.isArray(userInterests) && userInterests.length > 0) {
        const interestSet = new Set<string>();
        for (const interest of userInterests) {
            // Ensure each interest is a non-empty string before adding it to the set.
            if (typeof interest === 'string' && interest.length > 0) {
                interestSet.add(interest.toLowerCase());
            }
        }

        if (interestSet.size > 0) {
            const suggested = nonMemberProjects.filter(project => {
                // Match 1: Project tags
                if (Array.isArray(project.tags)) {
                    for (const tag of project.tags) {
                        // Defensively check that the tag and its display property are valid.
                        if (tag && typeof tag.display === 'string' && interestSet.has(tag.display.toLowerCase())) {
                            return true;
                        }
                    }
                }

                // Match 2: Project name or description
                const name = project.name || '';
                const description = project.description || '';
                const searchText = (name + ' ' + description).toLowerCase();

                for (const interest of interestSet) {
                    if (searchText.includes(interest)) {
                        return true;
                    }
                }

                return false;
            });

            if (suggested.length > 0) {
                return suggested
                    .sort((a, b) => {
                        // Defensively sort by creation date.
                        const dateA = a && a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
                        const dateB = b && b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
                        return dateB - dateA;
                    })
                    .slice(0, 3);
            }
        }
    }

    // 4. Fallback: If no interests match or the user has no interests, suggest random projects.
    if (nonMemberProjects.length > 0) {
        // Create a copy of the array before sorting to avoid mutating the original.
        const shuffled = [...nonMemberProjects].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }

    // If no projects are available for suggestion, return null.
    return null;
}
