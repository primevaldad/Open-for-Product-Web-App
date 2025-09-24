
import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User, Project, Tag, LearningPath, ProjectPathLink } from "@/lib/types";
import { getAllProjects, getAllProjectPathLinks, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const toISOString = (timestamp: any): string | any => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return timestamp;
};

const serializeLearningPath = (path: any): LearningPath => ({
    ...path,
    createdAt: toISOString(path.createdAt),
    updatedAt: toISOString(path.updatedAt),
});

const serializeProjectPathLink = (link: any): ProjectPathLink => ({
    ...link,
    createdAt: toISOString(link.createdAt),
});

const serializeProject = (project: Project): Project => ({
  ...project,
  createdAt: toISOString(project.createdAt),
  updatedAt: toISOString(project.updatedAt),
  startDate: project.startDate ? toISOString(project.startDate) : undefined,
  endDate: project.endDate ? toISOString(project.endDate) : undefined,
  tags: (project.tags || []).map(tag => ({
    ...tag,
    createdAt: toISOString(tag.createdAt),
    updatedAt: toISOString(tag.updatedAt),
  })) as Tag[],
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

// This is now a Server Component
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
                  <CardDescription>You haven't saved any project drafts yet.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Link href="/create">
                      <Button>Create a New Project</Button>
                  </Link>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
