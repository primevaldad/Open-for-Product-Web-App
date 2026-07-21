'use client';

import { useState, useTransition } from 'react';
import { requestProjectMatchAccessRefreshAction } from '@/app/actions/project-match';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function ProjectMatchRequestRefreshForm({ threadId }: { threadId: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !email.trim()) return;
    
    setStatus('idle');
    setMessage('');
    
    startTransition(async () => {
      // Add a slight delay so the user definitely sees the loading state
      const startedAt = Date.now();
      const response = await requestProjectMatchAccessRefreshAction(threadId, email);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 - elapsed));
      }
      
      if (response.success) {
        setStatus('sent');
        setMessage('');
        setEmail('');
        toast({
          title: 'Link sent',
          description: 'A fresh access link has been emailed to you.',
        });
      } else {
        setStatus('error');
        setMessage('error' in response ? (response as any).error : 'Unable to send a new link.');
        toast({
          title: 'Could not send link',
          description: 'error' in response ? (response as any).error : 'Unable to send a new link.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
      <label className="grid gap-2">
        <span className="text-sm font-medium">Email address</span>
        <Input 
          name="email" 
          type="email" 
          placeholder="you@example.com" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
        />
      </label>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={isPending || !email.trim()}>
          {isPending ? 'Pending...' : 'Send me a new link'}
        </Button>
        {status === 'error' && message ? (
          <p className="text-sm text-destructive">{message}</p>
        ) : null}
      </div>
    </form>
  );
}
