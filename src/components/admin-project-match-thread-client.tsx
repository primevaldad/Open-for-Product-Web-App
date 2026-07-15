'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';
import { addProjectMatchMessageAction, finalizeProjectMatchThreadAction, archiveProjectMatchThreadAction } from '@/app/actions/project-match';

function toText(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function AdminProjectMatchThreadClient({
  threadId,
  initialMessages,
  threadStatus,
}: {
  threadId: string;
  initialMessages: any[];
  threadStatus: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState('');

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    (state: any[], newMessage: any) => [...state, newMessage]
  );

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    const tempBody = body;
    setBody(''); // clear immediately

    addOptimisticMessage({
      id: `temp-${Date.now()}`,
      senderType: 'admin',
      body: tempBody,
      createdAt: new Date(),
    });

    startTransition(async () => {
      setPendingAction('reply');
      const result = await addProjectMatchMessageAction({
        threadId,
        body: tempBody,
        senderType: 'admin',
      });

      if (result && result.error) {
        toast({ title: 'Reply failed', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Reply sent', description: 'Your message was sent successfully.' });
        router.refresh();
      }
      setPendingAction(null);
    });
  };

  const handleAction = (action: 'finalize' | 'archive') => {
    startTransition(async () => {
      setPendingAction(action);
      const fn = action === 'finalize' ? finalizeProjectMatchThreadAction : archiveProjectMatchThreadAction;
      await fn(threadId);
      toast({ title: `Thread ${action}d` });
      router.refresh();
      setPendingAction(null);
    });
  };

  const isFinalized = threadStatus === 'finalized';
  const isArchived = threadStatus === 'archived';

  return (
    <>
      <div className="mt-8 space-y-4">
        {optimisticMessages.map((message: any) => (
          <article key={message.id} className="rounded-2xl border bg-background p-5 shadow-sm">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              {message.senderType} {message.createdAt ? `• ${toText(message.createdAt)}` : ''}
              {message.id.toString().startsWith('temp-') && <span className="ml-2 text-primary opacity-70 italic lowercase">(sending...)</span>}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </article>
        ))}
      </div>

      <form onSubmit={handleReply} className="mt-8 grid gap-4 rounded-2xl border shadow-sm bg-card p-6">
        <Textarea
          name="body"
          rows={5}
          placeholder={isFinalized ? "Thread is closed." : "Write an admin response..."}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isPending || isFinalized}
        />
        <div className="flex gap-3 flex-wrap">
          <Button type="submit" disabled={isPending || !body.trim() || isFinalized}>
            {isPending && pendingAction === 'reply' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reply
          </Button>
          <Button type="button" variant="outline" onClick={() => handleAction('finalize')} disabled={isPending || isFinalized || body.trim().length > 0}>
            {isPending && pendingAction === 'finalize' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Finalize
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleAction('archive')} disabled={isPending || isArchived || isFinalized}>
            {isPending && pendingAction === 'archive' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Archive
          </Button>
        </div>
      </form>
    </>
  );
}
