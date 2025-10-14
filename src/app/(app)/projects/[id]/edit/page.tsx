
import type { Project, Tag as GlobalTag } from "@/lib/types";
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById, getAllTags } from '@/lib/data.server';
import EditProjectForm from './edit-project-form';
import { updateProject } from '@/app/actions/projects';
import type { RoutePageProps } from '@/types/next-page-helpers';

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

const serializeProject = (project: Project): Project => {
  return {
    ...project,
    createdAt: toISOString(project.createdAt),
    updatedAt: toISOString(project.updatedAt),
    startDate: toISOString(project.startDate),
    endDate: toISOString(project.endDate),
  } as Project;
};

const serializeGlobalTag = (tag: GlobalTag): GlobalTag => ({
  ...tag,
  createdAt: toISOString(tag.createdAt),
  updatedAt: toISOString(tag.updatedAt),
});

async function getEditPageData(projectId: string) {
    const [currentUser, project, allTagsData] = await Promise.all([
        getAuthenticatedUser(),
        findProjectById(projectId),
        getAllTags()
    ]);

    if (!project) return { currentUser: null, project: null, allTags: [] };

    const serializedTags = allTagsData.map(serializeGlobalTag);
    return { currentUser, project, allTags: serializedTags };
}

// --- Server Component: EditProjectPage ---

export default async function EditProjectPage({ params }: RoutePageProps<{ id: string }>) {
  const { currentUser, project, allTags } = await getEditPageData(params.id);

  if (!project) {
    notFound();
  }

  if (!currentUser) {
      redirect("/login");
  }

  const isLead = project.team.some(member => member.userId === currentUser.id && member.role === 'lead');
  if (!isLead) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>You do not have permission to edit this project.</p>
        </div>
    );
  }

  const serializableProject = serializeProject(project);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href={`/projects/${project.id}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold md:text-xl">
          Edit: {project.name}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <EditProjectForm 
            project={serializableProject} 
            allTags={allTags} 
            updateProject={updateProject} 
        />
      </main>
    </div>
  );
}
