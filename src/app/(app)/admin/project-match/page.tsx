import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import { listProjectMatchThreadsAction } from '@/app/actions/project-match';
import { PageHeader } from '@/components/page-header';
import { ProjectMatchAdminClient } from '@/components/project-match-admin-client';
import type { ProjectMatchThread } from '@/lib/types';

export default async function ProjectMatchAdminPage() {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'admin') {
    return <div className="p-8">Unauthorized</div>;
  }

  const result = await listProjectMatchThreadsAction();
  if (!result.success || !result.data) {
    return <div className="p-8">Unable to load project match threads.</div>;
  }

  const threads = result.data as ProjectMatchThread[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Project match threads" />
      <div className="mt-8">
        <ProjectMatchAdminClient threads={threads} />
      </div>
    </main>
  );
}
