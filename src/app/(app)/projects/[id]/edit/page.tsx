
import type { Project, Tag as GlobalTag, ProjectTag, User } from "@/lib/types";
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById, getAllTags, getAllUsers } from '@/lib/data.server';
import EditProjectForm from './edit-project-form';

// --- Serialization Helpers ---

const toISOString = (timestamp: unknown): string | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: unknown }).toDate === 'function'
  ) {
    return ((timestamp as { toDate: () => Date }).toDate()).toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return undefined;
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

const serializeUser = (user: User): User => ({
    ...user,
    createdAt: toISOString(user.createdAt),
    updatedAt: toISOString(user.updatedAt),
  });

async function getEditPageData(projectId: string) {
    const [currentUser, project, allTagsData, allUsersData] = await Promise.all([
        getAuthenticatedUser(),
        findProjectById(projectId),
        getAllTags(),
        getAllUsers(),
    ]);

    if (!project) return { currentUser: null, project: null, allTags: [], users: [] };

    const tagsMap = new Map<string, GlobalTag>();
    allTagsData.forEach(tag => tagsMap.set(tag.id, tag));

    if (project.tags && Array.isArray(project.tags)) {
        const hydratedTags: ProjectTag[] = project.tags
            .map(projectTag => {
                const fullTag = tagsMap.get(projectTag.id);
                if (!fullTag) return null;
                return {
                    id: fullTag.id,
                    display: fullTag.display,
                    type: fullTag.type,
                };
            })
            .filter((tag): tag is ProjectTag => !!tag); 
        
        project.tags = hydratedTags;
    }

    const serializedTags = allTagsData.map(serializeGlobalTag);
    const serializedUsers = allUsersData.map(serializeUser);

    return { currentUser, project, allTags: serializedTags, users: serializedUsers };
}

// --- Server Component: EditProjectPage ---

export default async function EditProjectPage({ params: { id } }: { params: { id: string } }) {
  const { currentUser, project, allTags, users } = await getEditPageData(id);

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
            users={users} 
        />
      </main>
    </div>
  );
}
