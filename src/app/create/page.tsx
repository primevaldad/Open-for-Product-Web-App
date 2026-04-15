'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GlobalTag, User } from "@/lib/types";
import { getCreateProjectPageData } from "@/app/actions/projects";
import { CreateProjectForm } from "./create-project-form";
import { Skeleton } from '@/components/ui/skeleton';

interface PageData {
  allTags: GlobalTag[];
  allUsers: User[];
}

export default function CreateProjectPage() {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const response = await getCreateProjectPageData();
                if (response.success) {
                    setData({
                        allTags: response.allTags,
                        allUsers: response.allUsers,
                    });
                } else {
                    const errorResponse = response as { error: string };
                    if (errorResponse.error === 'User not authenticated.') {
                        router.push('/login');
                    } else {
                        setError(errorResponse.error);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            }
            setIsLoading(false);
        }

        fetchData();
    }, [router]);

    if (isLoading) {
        return (
            <div className="p-4 md:p-6">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <CreateProjectForm
            tags={data.allTags}
            users={data.allUsers}
        />
    );
}
