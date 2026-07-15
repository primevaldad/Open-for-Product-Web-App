import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getProjectMatchThreadForViewer } from '@/app/actions/project-match';
import { getProjectMatchGrant } from '@/lib/project-match';
import { getAuthenticatedUser } from '@/lib/session.server';
import { Timestamp } from 'firebase-admin/firestore';
import { PageHeader } from '@/components/page-header';
import { ProjectMatchReplyForm } from '@/components/project-match-reply-form';
import { ProjectMatchRefreshForm } from '@/components/project-match-refresh-form';

function toText(value: string | Timestamp | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

export default async function MatchThreadPage({ params }: { params: { threadId: string } }) {
  const grant = await getProjectMatchGrant(params.threadId);
  const viewer = await getProjectMatchThreadForViewer(params.threadId);
  const currentUser = await getAuthenticatedUser();

  if (!viewer.success || !viewer.data) {
    if (!grant && !currentUser?.role) {
      redirect('/match/thanks?error=access-denied');
    }
    notFound();
  }

  const { thread, messages } = viewer.data as any;
  const readOnly = thread.status === 'finalized' || thread.status === 'archived' || thread.status === 'expired';

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader title="Your match request">
        <ProjectMatchRefreshForm threadId={params.threadId} email={thread.email} />
      </PageHeader>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Email:</strong> {thread.email}</p>
          <p><strong>Status:</strong> {thread.status}</p>
          <p><strong>Interests:</strong> {thread.interests}</p>
          <p><strong>Contribution:</strong> {thread.contribution}</p>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {messages.map((message: any) => (
          <article key={message.id} className="rounded-2xl border bg-background p-5">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {message.senderType} {message.createdAt ? `• ${toText(message.createdAt)}` : ''}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </article>
        ))}
      </section>

      <ProjectMatchReplyForm threadId={params.threadId} disabled={readOnly} />

      {readOnly && (
        <p className="mt-8 text-sm text-muted-foreground">
          This thread is read-only now. You can request a fresh link if you need access again.
        </p>
      )}
    </main>
  );
}
