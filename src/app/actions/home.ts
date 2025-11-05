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
        const currentUserData = await getCurrentUser();
        const isGuest = currentUserData?.role === 'guest';

        const usersDataPromise = isGuest ? Promise.resolve([]) : getAllUsers();

        const [projectsData, usersData, allTags, learningPathsData, allProjectPathLinks] = await Promise.all([
            getAllProjects(),
            usersDataPromise,
            getAllTags(),
            getAllLearningPaths(),
            getAllProjectPathLinks(),
        ]);

        const allLearningPaths = Array.isArray(learningPathsData) ? learningPathsData : Object.values(learningPathsData || {});

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

            let suggestedProjects: HydratedProject[] | null = null;
            if (currentUserData && currentUserData.aiFeaturesEnabled) {
                const projectsForAI = allPublishedProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    tags: p.tags,
                    category: p.category,
                }));
        
                const suggestedProjectsFromAI = await getAiSuggestedProjects(currentUserData, projectsForAI);
        
                if (suggestedProjectsFromAI) {
                    suggestedProjects = projectsData
                        .filter(p => suggestedProjectsFromAI.some(sp => sp.id === p.id))
                        .map(p => toHydratedProject(p, usersMap));
                }
            }
            
            // Clean circular references from hydrated projects before serializing
            const cleanUser = (user: any) => {
                if (!user) return;
                delete user.projects;
                delete user.projectMembers;
            };

            allPublishedProjects.forEach(p => {
                cleanUser(p.owner);
                p.team.forEach(m => cleanUser(m.user));
            });
    
            if (suggestedProjects) {
                suggestedProjects.forEach(p => {
                    cleanUser(p.owner);
                    p.team.forEach(m => cleanUser(m.user));
                });
            }

            const aiEnabled = currentUserData?.aiFeaturesEnabled ?? false;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { projects, projectMembers, ...currentUser } = currentUserData || {};

        return deepSerialize({
            success: true,
            allPublishedProjects,
            currentUser,
            allTags,
            allLearningPaths,
            allProjectPathLinks,
            suggestedProjects,
            aiEnabled,
        });
    } catch (error) {
        console.error('[HOME_ACTION_TRACE] Error fetching home page data:', error);
        const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
        return {
            success: false,
            message: `Failed to load home page data: ${errorMessage}`,
        };
    }
}
