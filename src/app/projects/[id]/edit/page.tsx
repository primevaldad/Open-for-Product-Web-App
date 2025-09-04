
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, findProjectById } from '@/lib/data-cache';
import EditProjectForm from './edit-project-form';
import { updateProject } from '@/app/actions/projects';

async function getEditProjectPageData(projectId: string) {
    const currentUser = await getCurrentUser();
    const project = await findProjectById(projectId);

    if (!project) return { project: null, currentUser };

    return { project, currentUser };
}

// This is now a Server Component that fetches data and passes it to the form.
export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const { project, currentUser } = await getEditProjectPageData(params.id);

  if (!project || !currentUser) {
    notFound();
  }

  const isCurrentUserLead = project.team.some(member => member.userId === currentUser?.id && member.role === 'lead');

  if (!isCurrentUserLead) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>You do not have permission to edit this project.</p>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href={`/projects/${project.id}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold md:text-xl">
          Edit {project.name}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <EditProjectForm project={project} updateProject={updateProject} />
      </main>
    </div>
  );
}
