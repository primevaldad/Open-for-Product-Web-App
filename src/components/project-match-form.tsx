'use client';

import { useState, useTransition } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { createProjectMatchThreadAction } from '@/app/actions/project-match';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function ProjectMatchForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [interests, setInterests] = useState('');
  const [contribution, setContribution] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !email.trim()) return;

    startTransition(async () => {
      const result = await createProjectMatchThreadAction({
        email,
        interests,
        contribution,
      });

      if (result.success) {
        toast({
          title: 'Request received',
          description: 'Check your inbox for the one-time access link.',
        });
        setInterests('');
        setContribution('');
        setEmail('');
        router.push('/match/thanks');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Unable to submit request.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium">
        What kinds of work sound interesting?
        <input 
          name="interests" 
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Technology, education, writing, community..."
          className="rounded-xl border border-input bg-card px-4 py-3 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" 
          disabled={isPending}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        What could you imagine contributing?
        <input 
          name="contribution" 
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          placeholder="Feedback, research, design, testing, not sure yet..."
          className="rounded-xl border border-input bg-card px-4 py-3 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" 
          disabled={isPending}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Email address
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b7568]" />
            <input 
              required 
              type="email" 
              name="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-[#292820] outline-none placeholder:text-[#857f72] focus:ring-2 focus:ring-[#f1d3b2]" 
              disabled={isPending}
            />
          </div>
          <button 
            type="submit"
            disabled={isPending || !email.trim()}
            className="flex items-center justify-center rounded-xl bg-[#b8512c] px-5 py-3 font-semibold text-white hover:bg-[#9e4323] disabled:opacity-70"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Pending...' : 'Find my way in'}
          </button>
        </div>
      </label>
      <p className="text-xs text-[#e9e5d9]">
        We’ll use this to send your introductions—not to toss you into a generic funnel.
      </p>
    </form>
  );
}
