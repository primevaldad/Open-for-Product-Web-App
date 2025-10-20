
import { getAuthenticatedUser } from "@/lib/session.server";
import { redirect } from "next/navigation";
import { HydratedProject } from "@/lib/types";
import {
  getAllProjects,
  getAllUsers,
  getAllTags,
  getAllLearningPaths,
  getAllProjectPathLinks,
  getAiSuggestedProjects,
} from "@/lib/data.server";
import { toHydratedProject, deepSerialize } from "@/lib/utils";
import HomeClientPage from "./home-client-page";
import type { LearningPath, ProjectPathLink, Tag, User } from "@/lib/types";

async function getHomePageData(): Promise<{
  allPublishedProjects: HydratedProject[];
  currentUser: User;
  allTags: Tag[];
  allLearningPaths: LearningPath[];
  allProjectPathLinks: ProjectPathLink[];
  aiSuggestedProjects: HydratedProject[] | null;
}> {
  const [user, projectsData, usersData, allTags, allLearningPaths, allProjectPathLinks] = await Promise.all([
    getAuthenticatedUser(),
    getAllProjects(),
    getAllUsers(),
    getAllTags(),
    getAllLearningPaths(),
    getAllProjectPathLinks(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const usersMap = new Map(usersData.map((user) => [user.id, user]));

  const allPublishedProjects = projectsData
    .filter((p) => p.status === 'published')
    .map((p) => toHydratedProject(p, usersMap));

  // Get AI-suggested projects, but don't block the page load if it fails
  const aiSuggestedProjects = await getAiSuggestedProjects(user, allPublishedProjects).catch(err => {
    console.error("Failed to get AI suggested projects:", err);
    return null;
  });

  return deepSerialize({
    allPublishedProjects,
    currentUser: user,
    allTags,
    allLearningPaths,
    allProjectPathLinks,
    aiSuggestedProjects
  });
}

export default async function HomePage() {
  const {
    allPublishedProjects,
    currentUser,
    allTags,
    allLearningPaths,
    allProjectPathLinks,
    aiSuggestedProjects
  } = await getHomePageData();

  return (
    <HomeClientPage
      allPublishedProjects={allPublishedProjects}
      currentUser={currentUser}
      allTags={allTags}
      allLearningPaths={allLearningPaths}
      allProjectPathLinks={allProjectPathLinks}
      aiSuggestedProjects={aiSuggestedProjects}
    />
  );
}
