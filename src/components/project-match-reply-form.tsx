'use client';

import { useState, useTransition } from 'react';
import { addRequesterProjectMatchMessageAction } from '@/app/actions/project-match';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ProjectMatchReplyForm({ threadId, disabled }: { threadId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = () => {
    if (disabled || isPending) return;
    setStatus('idle');
    setMessage('');
    startTransition(async () => {
      const payload = new FormData();
      payload.set('threadId', threadId);
      payload.set('body', body);
      const response = await addRequesterProjectMatchMessageAction({ success: false }, payload);
      if (response.success) {
        setStatus('sent');
        setMessage(response.message || 'Reply sent.');
        setBody('');
        window.location.reload();
      } else {
        setStatus('error');
        setMessage(response.error || 'Unable to send reply.');
      }
    });
  };

  return (
    <div className="mt-8 grid gap-4 rounded-2xl border bg-card p-6">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Reply</span>
        <Textarea
          name="body"
          rows={5}
          placeholder="Send a note back..."
          disabled={disabled || isPending}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={disabled || isPending || !body.trim()} onClick={handleSubmit}>
          {isPending ? 'Sending...' : 'Send reply'}
        </Button>
        {status === 'sent' && message ? <p className="text-sm text-green-700">{message}</p> : null}
        {status === 'error' && message ? <p className="text-sm text-destructive">{message}</p> : null}
      </div>
    </div>
  );
}
