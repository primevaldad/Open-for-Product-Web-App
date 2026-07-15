'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { requestProjectMatchAccessRefreshAction } from '@/app/actions/project-match';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type RefreshStatus = 'idle' | 'sent' | 'error';

export function ProjectMatchRefreshForm({ threadId, email }: { threadId: string; email: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const handleRefresh = () => {
    setStatus('idle');
    setMessage('');
    startTransition(async () => {
      const startedAt = Date.now();
      const result: { success: boolean; error?: string } = await requestProjectMatchAccessRefreshAction(threadId, email);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }
      if (result.success) {
        setStatus('sent');
        setMessage('Sent');
        toast({
          title: 'Link sent',
          description: 'A fresh access link has been emailed to you.',
        });
      } else {
        setStatus('error');
        setMessage(result.error || 'Unable to send a new link.');
        toast({
          title: 'Could not send link',
          description: result.error || 'Unable to send a new link.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? 'Sending...' : status === 'sent' ? 'Sent' : 'Send me a new link'}
      </Button>
      {status === 'sent' && message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      {status === 'error' && message ? (
        <p className="mt-2 text-xs text-destructive">{message}</p>
      ) : null}
    </div>
  );
}
