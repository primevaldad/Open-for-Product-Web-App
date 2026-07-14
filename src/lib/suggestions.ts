
import { HydratedProject, GlobalTag, User } from "./types";
import { generateProjectEmbedding } from "./ai.server";
import { adminDb } from "./data.server";
import { FieldValue } from "firebase-admin/firestore";
import { toHydratedProject, serializeTimestamp } from "./utils.server";
import { getAllUsers } from "./data.server";

/**
 * Fetches AI-powered project suggestions based on the user's profile.
 * @param user - The current user.
 * @returns A promise that resolves to an array of suggested hydrated projects.
 */
async function fetchAiSuggestions(user: User): Promise<HydratedProject[]> {
    try {
        const profileText = [
            user.bio || "",
            (user.interests || []).map(i => i.display).join(", ")
        ].join("\n").trim();

        if (!profileText) return [];

        const embedding = await generateProjectEmbedding(profileText);
        if (!embedding) return [];

        const vectorValue = (FieldValue as any).vector(embedding);
        
        const projectsRef = adminDb.collection('projects');
        const searchResult = await projectsRef
            .where('status', '==', 'published')
            .findNearest('embedding', vectorValue, {
                limit: 10, // Fetch more to allow filtering out member projects
                distanceMeasure: 'COSINE',
            })
            .get();

        if (searchResult.empty) return [];

        // Hydrate results
        const usersData = await getAllUsers();
        const usersMap = new Map(usersData.map((u) => [u.id, u]));

        const projects = searchResult.docs
            .map((doc) => {
                const { embedding: _, ...data } = doc.data();
                // Check if user is already a member
                const team = data.team || [];
                if (team.some((m: any) => m.userId === user.id)) return null;

                return toHydratedProject({
                    ...data,
                    id: doc.id,
                    createdAt: serializeTimestamp(data.createdAt),
                    updatedAt: serializeTimestamp(data.updatedAt),
                    startDate: serializeTimestamp(data.startDate),
                    endDate: serializeTimestamp(data.endDate),
                } as any, usersMap);
            })
            .filter((p): p is HydratedProject => !!p)
            .slice(0, 3); // Return top 3 non-member matches

        return projects;
    } catch (error) {
        console.error("Failed to fetch AI suggestions:", error);
        return [];
    }
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
    allTags: GlobalTag[], // Kept for API consistency.
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
            const aiSuggestions = await fetchAiSuggestions(currentUser);
            for (const project of aiSuggestions) {
                if (suggestions.length < 3 && project && project.id && !suggestionIds.has(project.id)) {
                    suggestions.push(project);
                    suggestionIds.add(project.id);
                }
            }
        }

        // 2. Interest-based suggestions
        if (suggestions.length < 3) {
            const interests = (currentUser.interests || []).map(i => i.display?.toLowerCase()).filter(Boolean);
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

    // --- FALLBACK 1: Fill with random projects (strictly excluding member projects) ---
    if (suggestions.length < 3) {
        const candidates = validProjects.filter(p => !suggestionIds.has(p.id) && !p.team?.some(m => m.userId === currentUser?.id));
        
        const shuffled = candidates.sort(() => 0.5 - Math.random());
        while (suggestions.length < 3 && shuffled.length > 0) {
            const candidate = shuffled.pop()!;
            suggestions.push(candidate);
            suggestionIds.add(candidate.id);
        }
    }

    // --- FALLBACK 2: Fill with most recent projects (strictly excluding member projects) ---
    if (suggestions.length < 3) {
        const recentProjects = validProjects
            .filter(p => !suggestionIds.has(p.id) && !p.team?.some(m => m.userId === currentUser?.id))
            .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

        while (suggestions.length < 3 && recentProjects.length > 0) {
            const project = recentProjects.shift()!;
            suggestions.push(project);
            suggestionIds.add(project.id);
        }
    }

    return suggestions.slice(0, 3);
}
