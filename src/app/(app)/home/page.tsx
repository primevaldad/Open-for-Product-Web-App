
import { getCurrentUser } from "@/lib/session.server";
import { HydratedProject } from "@/lib/types";
import {
  getAllProjects,
  getAllUsers,
  getAllTags,
  getAllLearningPaths,
  getAllProjectPathLinks,
} from "@/lib/data.server";
import { toHydratedProject, deepSerialize } from "@/lib/utils";
import HomeClientPage from "./home-client-page";
import type { LearningPath, ProjectPathLink, Tag, User } from "@/lib/types";

async function getHomePageData(): Promise<{
  allPublishedProjects: HydratedProject[];
  currentUser: User | null;
  allTags: Tag[];
  allLearningPaths: LearningPath[];
  allProjectPathLinks: ProjectPathLink[];
}> {
  // Use getCurrentUser which returns null for guests instead of throwing
  const [user, projectsData, usersData, allTags, allLearningPaths, allProjectPathLinks] = await Promise.all([
    getCurrentUser(),
    getAllProjects(),
    getAllUsers(),
    getAllTags(),
    getAllLearningPaths(),
    getAllProjectPathLinks(),
  ]);

  const usersMap = new Map(usersData.map((user) => [user.id, user]));

  const allPublishedProjects = projectsData
    .filter((p) => p.status === 'published')
    .map((p) => toHydratedProject(p, usersMap));

  return deepSerialize({
    allPublishedProjects,
    currentUser: user,
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
