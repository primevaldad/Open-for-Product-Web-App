'use client';

import { useEffect, useState } from 'react';
import HomeClientPage from "./home-client-page";
import { getHomePageData } from '@/app/actions/home';
import type { HomePageData, HomePageDataResponse } from "@/lib/types";
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
    const [data, setData] = useState<HomePageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response: HomePageDataResponse = await getHomePageData();

                if (response.success) {
                    // On success, the server action returns the PageData along with the `success: true` flag.
                    // The component state only needs the PageData, so we use destructuring to separate it.
                    const { success, ...pageData } = response;
                    setData(pageData);
                } else {
                    // On failure, we set the error message.
                    setError(response.message);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            }
            setIsLoading(false);
        }

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-32 w-full" />
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
        <HomeClientPage
            allPublishedProjects={data.allPublishedProjects}
            currentUser={data.currentUser}
            allTags={data.allTags}
            allLearningPaths={data.allLearningPaths}
            allProjectPathLinks={data.allProjectPathLinks}
            suggestedProjects={data.suggestedProjects}
            aiEnabled={data.aiEnabled}
        />
    );
}
