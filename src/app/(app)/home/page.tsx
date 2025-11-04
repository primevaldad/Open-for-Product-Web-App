'use client';

import { useEffect, useState } from 'react';
import HomeClientPage from "./home-client-page";
import { getHomePageData } from '@/app/actions/home';
import type { HydratedProject, User, LearningPath, ProjectPathLink, Tag } from "@/lib/types";
import { Skeleton } from '@/components/ui/skeleton';

// Define the error response shape locally for the type guard
interface ErrorResponse {
  success: false;
  message: string;
}

// User-defined type guard for error response
function isErrorResponse(response: any): response is ErrorResponse {
    return response && response.success === false && typeof response.message === 'string';
}

// Define the shape of the success response data
interface PageData {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: Tag[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
    suggestedProjects: HydratedProject[] | null;
    aiEnabled: boolean;
}

export default function HomePage() {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getHomePageData();

                if (isErrorResponse(response)) {
                    setError(response.message);
                } else {
                    // Type is correctly inferred here
                    setData(response);
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
