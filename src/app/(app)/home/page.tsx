
import { redirect } from 'next/navigation';
import { SuggestSteps } from "@/components/ai/suggest-steps";
import { getAllProjects, getAllTags, getAllProjectPathLinks, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import { UserNotFoundError } from "@/lib/errors";
import HomeClientPage from "./home-client-page";
import type { Project, Tag, ProjectTag, ProjectPathLink, LearningPath, User } from "@/lib/types";
import { serializeTimestamp } from '@/lib/utils'; // Import the centralized helper

// --- Serialization Helpers ---
// Local toISOString removed in favor of central serializeTimestamp

const serializeGlobalTag = (tag: Tag): Tag => ({
  ...tag,
  createdAt: serializeTimestamp(tag.createdAt) ?? undefined,
  updatedAt: serializeTimestamp(tag.updatedAt) ?? undefined,
});

const serializeLearningPath = (path: LearningPath): LearningPath => ({
    ...path,
    createdAt: serializeTimestamp(path.createdAt) ?? undefined,
    updatedAt: serializeTimestamp(path.updatedAt) ?? undefined,
});

const serializeProjectPathLink = (link: ProjectPathLink): ProjectPathLink => ({
    ...link,
});

// Correctly serializes a project and transforms its tags with strong types
const serializeProject = (project: Project): Project => {
  const projectTags: ProjectTag[] = (project.tags || []).map((tag: any) => ({ // Use any here temporarily as source type is mixed
      id: tag.id,
      display: tag.display,
      role: tag.type, // Map type to role
  }));

  return {
    ...project,
    createdAt: serializeTimestamp(project.createdAt) ?? undefined,
    updatedAt: serializeTimestamp(project.updatedAt) ?? undefined,
    startDate: project.startDate ? serializeTimestamp(project.startDate) : undefined,
    endDate: project.endDate ? serializeTimestamp(project.endDate) : undefined,
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
        
        const serializedUser: User = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatarUrl: currentUser.avatarUrl,
            bio: currentUser.bio,
            interests: currentUser.interests || [],
            onboarded: currentUser.onboarded,
            createdAt: serializeTimestamp(currentUser.createdAt) ?? undefined,
            lastLogin: serializeTimestamp(currentUser.lastLogin) ?? undefined,
        };

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
