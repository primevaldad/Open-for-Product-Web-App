import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import { listProjectMatchThreadsAction } from '@/app/actions/project-match';
import { PageHeader } from '@/components/page-header';

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

  const threads = result.data as any[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Project match threads" />
      <div className="mt-8 grid gap-4">
        {threads.map((thread) => (
          <Link key={thread.id} href={`/admin/project-match/${thread.id}`} className="rounded-2xl border bg-card p-5 hover:bg-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{thread.email}</p>
                <p className="text-sm text-muted-foreground">{thread.interests}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{thread.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
