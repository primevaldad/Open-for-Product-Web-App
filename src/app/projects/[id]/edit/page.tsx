
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getData } from '@/lib/data-cache';
import EditProjectForm from './edit-project-form';

// This is now a Server Component that fetches data and passes it to the form.
export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const { projects, currentUser } = await getData();
  const project = projects.find((p) => p.id === params.id);
  
  if (!project) {
    notFound();
  }

  const isCurrentUserLead = project.team.some(member => member.user.id === currentUser?.id && member.role === 'lead');

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
        <EditProjectForm project={project} />
      </main>
    </div>
  );
}
