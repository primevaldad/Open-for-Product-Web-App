'use client';

import { useEffect, useState } from 'react';
import { getLearningPathsAction, LearningPathsActionResponse } from '@/app/actions/learning';
import LearningPathCard from '@/components/learning-path-card';
import type { LearningPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export default function LearningPathsPage() {
    const [paths, setPaths] = useState<LearningPath[]>([]);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    async function fetchLearningPaths(startAfter: QueryDocumentSnapshot<DocumentData> | null = null) {
        setIsLoading(true);
        try {
            const response = await getLearningPathsAction(10, startAfter);

            if (!response.success) {
                console.error("Failed to fetch learning paths:", response.error);
                setHasMore(false);
                setIsLoading(false);
                return;
            }

            setPaths(prevPaths => {
                const allPaths = [...prevPaths, ...response.paths];
                const uniquePathsMap = new Map();
                allPaths.forEach(path => uniquePathsMap.set(path.pathId, path));
                return Array.from(uniquePathsMap.values());
            });
            setLastVisible(response.lastVisible as QueryDocumentSnapshot<DocumentData>);
            setHasMore(response.paths.length === 10);

        } catch (error) {
            console.error("Failed to fetch learning paths:", error);
            setHasMore(false);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        fetchLearningPaths();
    }, []);

    const handleLoadMore = () => {
        if (lastVisible) {
            fetchLearningPaths(lastVisible);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-primary">Learning Paths</h1>
                <p className="text-lg text-muted-foreground mt-2">Follow these structured paths to master new skills and technologies.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paths.map(path => (
                    <LearningPathCard key={path.pathId} path={path} />
                ))}
                {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
            {hasMore && !isLoading && (
                <div className="text-center mt-8">
                    <Button onClick={handleLoadMore}>Load More</Button>
                </div>
            )}
        </div>
    );
}
