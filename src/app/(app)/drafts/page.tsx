'use client';

import { useEffect, useState } from 'react';
import type { LearningPath, ProjectPathLink, HydratedProject, User } from "@/lib/types";
import { getDraftsPageData } from "@/app/actions/projects";
import { getCurrentUser } from "@/app/actions/users";
import ProjectCard from "@/components/project-card";
import { Skeleton } from '@/components/ui/skeleton';

interface PageData {
    drafts: HydratedProject[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
}

export default function DraftsPage() {
    const [data, setData] = useState<PageData | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [draftsResponse, userResponse] = await Promise.all([
                    getDraftsPageData(),
                    getCurrentUser()
                ]);

                if (draftsResponse.success && userResponse.success) {
                    setData({
                        drafts: draftsResponse.drafts,
                        allLearningPaths: draftsResponse.allLearningPaths,
                        allProjectPathLinks: draftsResponse.allProjectPathLinks
                    });
                    setCurrentUser(userResponse.data || null);
                } else if (!draftsResponse.success) {
                    setError(draftsResponse.error);
                } else if (!userResponse.success) {
                    setError(userResponse.error);
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
                <h1 className="text-2xl font-bold mb-4">My Drafts</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
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

    if (!data || !currentUser) {
        return null; 
    }

    const { drafts, allLearningPaths, allProjectPathLinks } = data;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">My Drafts</h1>
            {drafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map((draft) => (
                        <ProjectCard 
                            key={draft.id} 
                            project={draft} 
                            currentUser={currentUser}
                            allLearningPaths={allLearningPaths} 
                            allProjectPathLinks={allProjectPathLinks} 
                        />
                    ))}
                </div>
            ) : (
                <p>You have no drafts.</p>
            )}
        </div>
    );
}
