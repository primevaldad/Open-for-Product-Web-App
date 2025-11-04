'use client';

import type { Project, Tag, User } from "@/lib/types";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEditProjectPageData } from '@/app/actions/projects';
import EditProjectForm from './edit-project-form';
import { Skeleton } from '@/components/ui/skeleton';

interface PageData {
  project: Project;
  allTags: Tag[];
  users: User[];
}

export default function EditProjectPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await getEditProjectPageData(id);
        if (response.success) {
            setData({
                project: response.project,
                allTags: response.allTags,
                users: response.allUsers,
            });
        } else {
            setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
      setIsLoading(false);
    }

    fetchData();
  }, [id, router]);

  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-48" />
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </main>
        </div>
    );
  }

  if (error) {
    if (error === 'Project not found.') {
        notFound();
    }
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-red-500">Error: {error}</p>
        </div>
    );
  }

  if (!data) {
    return null; // Or a more specific loading/empty state
  }

  const { project, allTags, users } = data;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href={`/projects/${project.id}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold md:text-xl">
          Edit: {project.name}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <EditProjectForm 
            project={project} 
            allTags={allTags}
            users={users} 
        />
      </main>
    </div>
  );
}
