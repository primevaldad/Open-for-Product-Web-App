import Link from 'next/link';
import { requestProjectMatchAccessRefreshAction } from '@/app/actions/project-match';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectMatchRequestRefreshForm } from '@/components/project-match-request-refresh-form';

export default function MatchThanksPage({ searchParams }: { searchParams: { error?: string; threadId?: string } }) {
  const hasError = searchParams.error === 'access-denied';
  const threadId = searchParams.threadId;



  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
      <div className="rounded-3xl border bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Project match
        </p>
        <h1 className="mt-4 text-3xl font-bold">
          {hasError ? 'We could not open that thread' : 'We got your request'}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {hasError
            ? 'If you need access again, we can send a fresh one-time link to the email on file.'
            : 'We have your request. Check your inbox for the one-time access link, then keep that email handy for future refreshes.'}
        </p>
        {hasError && threadId ? (
          <ProjectMatchRequestRefreshForm threadId={threadId} />
        ) : null}
        <div className="mt-6">
          <Link href="/" className="text-sm font-medium text-primary underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
