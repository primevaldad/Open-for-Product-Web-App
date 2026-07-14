import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Open for Product',
};

import { getProjectsPageData } from '@/app/actions/projects-page';
import { ProjectsPageDataResponse } from '@/lib/types';
import ProjectsClientPage from './projects-client-page';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Force dynamic rendering because this page depends on user sessions (cookies)
export const dynamic = 'force-dynamic';

async function ProjectsFeed() {
  const data: ProjectsPageDataResponse = await getProjectsPageData();

  if ('error' in data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Error: {data.error}</p>
      </div>
    );
  }

  return <ProjectsClientPage {...data} />;
}

function ProjectsSkeleton() {
  return (
    <div className="p-6 md:p-12 space-y-6 w-full max-w-7xl mx-auto">
      {/* Search Header Skeleton */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-32 hidden md:block" />
        </div>
        <Skeleton className="h-10 w-full mt-2" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsFeed />
    </Suspense>
  );
}
