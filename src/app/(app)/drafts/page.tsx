
import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, LearningPath, ProjectPathLink, ProjectTag } from "@/lib/types";
import { getAllProjects, getAllProjectPathLinks, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { serializeTimestamp } from "@/lib/utils"; // Import the centralized helper

// Removed local toISOString helper

const serializeLearningPath = (path: LearningPath): LearningPath => ({
    ...path,
    createdAt: serializeTimestamp(path.createdAt) ?? undefined,
    updatedAt: serializeTimestamp(path.updatedAt) ?? undefined,
});

const serializeProjectPathLink = (link: ProjectPathLink): ProjectPathLink => ({
    ...link,
    // Note: ProjectPathLink type does not have createdAt, but if the raw object did, 
    // this is where it would be serialized. We will trust the type for now.
});

const serializeProject = (project: Project): Project => ({
  ...project,
  createdAt: serializeTimestamp(project.createdAt) ?? undefined,
  updatedAt: serializeTimestamp(project.updatedAt) ?? undefined,
  startDate: project.startDate ? serializeTimestamp(project.startDate) : undefined,
  endDate: project.endDate ? serializeTimestamp(project.endDate) : undefined,
  // Correctly map Tag-like structure to ProjectTag, preserving all properties
  tags: (project.tags || []).map(tag => ({
    id: tag.id,
    display: tag.display,
    role: (tag as any).type, // Map 'type' from Tag to 'role' in ProjectTag
    createdAt: serializeTimestamp(tag.createdAt) ?? undefined,
    updatedAt: serializeTimestamp(tag.updatedAt) ?? undefined,
  })) as ProjectTag[],
});

async function getDraftsPageData() {
    const currentUser = await getAuthenticatedUser();
    const [projects, allProjectPathLinks, allLearningPaths] = await Promise.all([
        getAllProjects(),
        getAllProjectPathLinks(),
        getAllLearningPaths(),
    ]);

    const serializedProjects = projects.map(serializeProject);
    const serializedProjectPathLinks = allProjectPathLinks.map(serializeProjectPathLink);
    const serializedLearningPaths = allLearningPaths.map(serializeLearningPath);

    return {
        currentUser,
        projects: serializedProjects,
        allProjectPathLinks: serializedProjectPathLinks,
        allLearningPaths: serializedLearningPaths
    };
}

export default async function DraftsPage() {
  const { currentUser, projects, allProjectPathLinks, allLearningPaths } = await getDraftsPageData();

  if (!currentUser) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading user...</p>
        </div>
    );
  }

  const draftProjects = projects.filter(p => p.status === 'draft' && p.team.some(m => m.userId === currentUser.id));

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">My Drafts</h1>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {draftProjects.length > 0 ? (
            draftProjects.map((project) => (
                <ProjectCard 
                    key={project.id} 
                    project={project} 
                    allProjectPathLinks={allProjectPathLinks} 
                    allLearningPaths={allLearningPaths} 
                />
            ))
        ) : (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>No Drafts Found</CardTitle>
                    {/* Corrected unescaped apostrophe */}
                    <CardDescription>You haven&apos;t saved any project drafts yet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/create">
                        <Button>Create a New Project</Button>
                    </Link>
                </CardContent>
            </Card>
        )}
        </div>
    </div>
  );
}
