
import { redirect } from 'next/navigation';

import { SuggestSteps } from "@/components/ai/suggest-steps";
import { getAllProjects, getAllTags, getAllProjectPathLinks, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { UserNotFoundError } from "@/lib/errors";
import HomeClientPage from "./home-client-page";
import type { Project, Tag, ProjectTag, ProjectPathLink, LearningPath } from "@/lib/types";

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

const serializeLearningPath = (path: LearningPath): LearningPath => ({
    ...path,
    createdAt: toISOString(path.createdAt),
    updatedAt: toISOString(path.updatedAt),
});

const serializeProjectPathLink = (link: ProjectPathLink): ProjectPathLink => ({
    ...link,
    createdAt: toISOString(link.createdAt),
});


// Correctly serializes a project and transforms its tags
const serializeProject = (project: any): Project => {
  const projectTags: ProjectTag[] = (project.tags || []).map((tag: Tag) => ({
      id: tag.id,
      display: tag.display,
      role: tag.type,
  }));

  return {
    ...project,
    createdAt: toISOString(project.createdAt),
    updatedAt: toISOString(project.updatedAt),
    startDate: project.startDate ? toISOString(project.startDate) : undefined,
    endDate: project.endDate ? toISOString(project.endDate) : undefined,
    tags: projectTags,
  };
};


async function getDashboardPageData() {
    try {
        const currentUser = await getAuthenticatedUser();

        if (!currentUser.onboarded) {
            redirect('/onboarding');
        }

        const [allProjects, allTags, allProjectPathLinks, allLearningPaths] = await Promise.all([
            getAllProjects(),
            getAllTags(),
            getAllProjectPathLinks(),
            getAllLearningPaths(),
        ]);

        const publishedProjects = allProjects.filter(p => p.status === 'published');

        const serializedProjects = publishedProjects.map(serializeProject);
        const serializedTags = allTags.map(serializeGlobalTag);
        const serializedProjectPathLinks = allProjectPathLinks.map(serializeProjectPathLink);
        const serializedLearningPaths = allLearningPaths.map(serializeLearningPath);
        
        // Serialize the currentUser object as well
        const serializedUser = {
            ...currentUser,
            createdAt: toISOString(currentUser.createdAt),
            lastLogin: toISOString(currentUser.lastLogin),
        }

        return {
            currentUser: serializedUser,
            projects: serializedProjects,
            tags: serializedTags,
            allProjectPathLinks: serializedProjectPathLinks,
            allLearningPaths: serializedLearningPaths,
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
  const { currentUser, projects, tags, allProjectPathLinks, allLearningPaths } = await getDashboardPageData();

  if (!currentUser) {
    redirect('/login');
  }

  return (
    <>
        <div className="mb-6">
            <SuggestSteps 
                currentUser={currentUser}
                allProjects={projects}
                allProjectPathLinks={allProjectPathLinks} 
                allLearningPaths={allLearningPaths} 
            />
        </div>
        <HomeClientPage 
            allPublishedProjects={projects} 
            currentUser={currentUser} 
            allTags={tags} 
            allProjectPathLinks={allProjectPathLinks}
            allLearningPaths={allLearningPaths}
        />
    </>
  );
}
