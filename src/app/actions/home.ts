'use server';

import { getCurrentUser } from "@/lib/session.server";
import type { HydratedProject, HydratedProjectMember, Project, User, LearningPath, ProjectPathLink, Tag } from "@/lib/types";
import {
  getAllProjects,
  getAllUsers,
  getAllTags,
  getAllLearningPaths,
  getAllProjectPathLinks,
  getAiSuggestedProjects,
} from "@/lib/data.server";
import { toHydratedProject, deepSerialize } from "@/lib/utils.server";

export async function getHomePageData() {
    try {
        const currentUser = await getCurrentUser();
        const isGuest = currentUser?.role === 'guest';

        const usersDataPromise = isGuest ? Promise.resolve([]) : getAllUsers();

        const [projectsData, usersData, allTags, allLearningPaths, allProjectPathLinks] = await Promise.all([
            getAllProjects(),
            usersDataPromise,
            getAllTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        const usersMap = new Map(usersData.map((user) => [user.id, user]));

        const allPublishedProjects = projectsData
            .filter((p) => p.status === 'published')
            .map((p: Project): HydratedProject => {
            if (isGuest) {
                const guestHydratedTeam: HydratedProjectMember[] = p.team.map(member => ({
                ...member,
                user: {
                    id: member.userId,
                    name: 'Community Member',
                    email: '',
                    username: '',
                    role: 'user',
                    onboardingCompleted: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }
                }));

                const guestOwner: User = {
                    id: p.ownerId,
                    name: 'Project Lead',
                    email: '',
                    username: '',
                    role: 'user',
                    onboardingCompleted: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const { ownerId, team, ...restOfProject } = p;

                return {
                    ...restOfProject,
                    owner: guestOwner,
                    team: guestHydratedTeam,
                };
            }
            return toHydratedProject(p, usersMap);
            });

            let suggestedProjects = null;
            if (currentUser && currentUser.aiFeaturesEnabled) {
                const projectsForAI = allPublishedProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    tags: p.tags,
                    category: p.category,
                }));
        
                const suggestedProjectsFromAI = await getAiSuggestedProjects(currentUser, projectsForAI);
        
                if (suggestedProjectsFromAI) {
                    suggestedProjects = projectsData
                        .filter(p => suggestedProjectsFromAI.some(sp => sp.id === p.id))
                        .map(p => toHydratedProject(p, usersMap));
                }
            }

            const aiEnabled = currentUser?.aiFeaturesEnabled ?? false;

        return deepSerialize({
            success: true,
            allPublishedProjects,
            currentUser: currentUser,
            allTags,
            allLearningPaths,
            allProjectPathLinks,
            suggestedProjects,
            aiEnabled,
        });
    } catch (error) {
        const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
        return deepSerialize({
            success: false,
            message: `Failed to load home page data: ${errorMessage}`,
        });
    }
}
