import { redirect, notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import { getProjectMatchThreadAdminAction, addProjectMatchMessageAction, finalizeProjectMatchThreadAction, archiveProjectMatchThreadAction, updateProjectMatchThreadNotesAction } from '@/app/actions/project-match';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default async function ProjectMatchThreadAdminPage({ params }: { params: { threadId: string } }) {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) redirect('/login');
  if (currentUser.role !== 'admin') return <div className="p-8">Unauthorized</div>;

  const result = await getProjectMatchThreadAdminAction(params.threadId);
  if (!result.success || !result.data) notFound();

  const { thread, messages } = result.data as any;

  async function replyAction(formData: FormData) {
    'use server';
    await addProjectMatchMessageAction({
      threadId: params.threadId,
      body: String(formData.get('body') || ''),
      senderType: 'admin',
    });
  }

  async function finalizeAction() {
    'use server';
    await finalizeProjectMatchThreadAction(params.threadId);
  }

  async function archiveAction() {
    'use server';
    await archiveProjectMatchThreadAction(params.threadId);
  }

  async function notesAction(formData: FormData) {
    'use server';
    await updateProjectMatchThreadNotesAction({
      threadId: params.threadId,
      internalNote: String(formData.get('internalNote') || ''),
      leadMessage: String(formData.get('leadMessage') || ''),
      inviteEmailSnapshot: String(formData.get('inviteEmailSnapshot') || ''),
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader title={`Thread: ${thread.email}`} />
      <div className="mt-6 rounded-2xl border bg-card p-6 text-sm space-y-2">
        <p><strong>Status:</strong> {thread.status}</p>
        <p><strong>Interests:</strong> {thread.interests}</p>
        <p><strong>Contribution:</strong> {thread.contribution}</p>
      </div>

      <form action={notesAction} className="mt-6 grid gap-4 rounded-2xl border bg-card p-6">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Internal note</span>
          <Textarea name="internalNote" defaultValue={thread.internalNote || ''} rows={3} placeholder="Lead-only note for the intro..." />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Lead intro message</span>
          <Textarea name="leadMessage" defaultValue={thread.leadMessage || ''} rows={4} placeholder="The message we want leads to see alongside the invite..." />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Invite email snapshot</span>
          <Textarea name="inviteEmailSnapshot" defaultValue={thread.inviteEmailSnapshot || ''} rows={5} placeholder="Optional: paste the full invite email or the relevant outbound message..." />
        </label>
        <div>
          <Button type="submit" variant="outline">Save notes</Button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {messages.map((message: any) => (
          <article key={message.id} className="rounded-2xl border bg-background p-5">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{message.senderType}</div>
            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </article>
        ))}
      </div>

      <form action={replyAction} className="mt-8 grid gap-4 rounded-2xl border bg-card p-6">
        <Textarea name="body" rows={5} placeholder="Write an admin response..." />
        <div className="flex gap-3">
          <Button type="submit">Send reply</Button>
          <Button type="submit" formAction={finalizeAction} variant="outline">Finalize</Button>
          <Button type="submit" formAction={archiveAction} variant="secondary">Archive</Button>
        </div>
      </form>
    </main>
  );
}
