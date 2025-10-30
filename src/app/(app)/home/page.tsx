
import { getCurrentUser } from "@/lib/session.server";
import { HydratedProject, HydratedProjectMember, Project, User } from "@/lib/types";
import {
  getAllProjects,
  getAllUsers,
  getAllTags,
  getAllLearningPaths,
  getAllProjectPathLinks,
} from "@/lib/data.server";
import { toHydratedProject, deepSerialize } from "@/lib/utils";
import HomeClientPage from "./home-client-page";
import type { LearningPath, ProjectPathLink, Tag } from "@/lib/types";

async function getHomePageData(): Promise<{
  allPublishedProjects: HydratedProject[];
  currentUser: User | null;
  allTags: Tag[];
  allLearningPaths: LearningPath[];
  allProjectPathLinks: ProjectPathLink[];
}> {
  const currentUser = await getCurrentUser();
  const isGuest = currentUser?.role === 'guest';

  // Conditionally fetch user data only for non-guests
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
        // For guests, create a "hydrated" project with placeholder user data
        // to satisfy type requirements and render UI correctly.
        const guestHydratedTeam: HydratedProjectMember[] = p.team.map(member => ({
          ...member,
          // Create a full placeholder user object that satisfies the 'User' type.
          user: {
            id: member.userId,
            name: 'Community Member',
            email: '',
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
            role: 'user',
            onboardingCompleted: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Manually construct the HydratedProject for guests
        const { ownerId, team, ...restOfProject } = p;

        return {
            ...restOfProject,
            owner: guestOwner,
            team: guestHydratedTeam,
        };
      }
      // For authenticated users, use the normal hydration.
      return toHydratedProject(p, usersMap);
    });

  return deepSerialize({
    allPublishedProjects,
    currentUser: currentUser,
    allTags,
    allLearningPaths,
    allProjectPathLinks,
  });
}

export default async function HomePage() {
  const {
    allPublishedProjects,
    currentUser,
    allTags,
    allLearningPaths,
    allProjectPathLinks,
  } = await getHomePageData();

  return (
    <HomeClientPage
      allPublishedProjects={allPublishedProjects}
      currentUser={currentUser}
      allTags={allTags}
      allLearningPaths={allLearningPaths}
      allProjectPathLinks={allProjectPathLinks}
    />
  );
}
