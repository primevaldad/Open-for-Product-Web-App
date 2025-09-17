
import { redirect } from 'next/navigation';

import { SuggestSteps } from "@/components/ai/suggest-steps";
import { getAllProjects, getAllTags } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { UserNotFoundError } from "@/lib/errors";
import HomeClientPage from "./home-client-page";
import type { Project, Tag, ProjectTag } from "@/lib/types";

// --- Serialization Helpers ---
const toISOString = (timestamp: any): string | any => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return timestamp;
};

const serializeGlobalTag = (tag: Tag): Tag => ({
  ...tag,
  createdAt: toISOString(tag.createdAt),
  updatedAt: toISOString(tag.updatedAt),
});

// Correctly serializes a project and transforms its tags
const serializeProject = (project: any): Project => {
  // The incoming project from getAllProjects has a `tags` array of full `Tag` objects.
  // We need to convert them to the expected `ProjectTag[]` format.
  const projectTags: ProjectTag[] = (project.tags || []).map((tag: Tag) => ({
      id: tag.id,
      display: tag.display, // Use the global display name
      role: tag.type, // Use the global `type` as the project-specific `role`
  }));

  return {
    ...project,
    createdAt: toISOString(project.createdAt),
    updatedAt: toISOString(project.updatedAt),
    startDate: project.startDate ? toISOString(project.startDate) : undefined,
    endDate: project.endDate ? toISOString(project.endDate) : undefined,
    tags: projectTags, // Assign the correctly transformed array
  };
};


async function getDashboardPageData() {
    try {
        const currentUser = await getAuthenticatedUser();

        if (!currentUser.onboarded) {
            redirect('/onboarding');
        }

        const [allProjects, allTags] = await Promise.all([
            getAllProjects(),
            getAllTags(),
        ]);

        const publishedProjects = allProjects.filter(p => p.status === 'published');

        const serializedProjects = publishedProjects.map(serializeProject);
        const serializedTags = allTags.map(serializeGlobalTag);

        return {
            currentUser,
            projects: serializedProjects,
            tags: serializedTags,
        }
    } catch (error) {
        if (error instanceof UserNotFoundError) {
            console.log('User authenticated but not found in DB. Redirecting to logout route.');
            redirect('/api/auth/logout');
        } else if (error instanceof Error && error.message === 'User not authenticated') {
            console.log('User not authenticated, redirecting to logout.')
            redirect('/api/auth/logout');
        }

        throw error;
    }
}

export default async function DashboardPage() {
  const { currentUser, projects, tags } = await getDashboardPageData();

  if (!currentUser) {
    redirect('/login');
  }

  const suggestedProject = projects.length > 1 ? projects[1] : projects.length === 1 ? projects[0] : null;

  return (
    <>
        <div className="mb-6">
            {suggestedProject && <SuggestSteps suggestedProject={suggestedProject} />}
        </div>
        <HomeClientPage allPublishedProjects={projects} currentUser={currentUser} allTags={tags} />
    </>
  );
}
