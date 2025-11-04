'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActivityClientPage } from "./activity-client-page";
import { getActivityPageData } from "@/app/actions/activity";
import { updateTask, deleteTask } from "@/app/actions/projects";
import { Skeleton } from '@/components/ui/skeleton';
import type { HydratedActivityItem } from "./utils";
import type { User, Project, Task, HydratedTask } from "@/lib/types";

// Define the shape of the success and error responses from the server action
interface SuccessResponse {
    success: true;
    currentUser: User;
    activity: HydratedActivityItem[];
    myTasks: HydratedActivityItem[];
    createdTasks: HydratedActivityItem[];
    projects: Project[];
    users: User[];
}

interface ErrorResponse {
    success: false;
    message: string;
}

type PageDataResponse = SuccessResponse | ErrorResponse;

export default function ActivityPage() {
    const [data, setData] = useState<SuccessResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await getActivityPageData() as PageDataResponse;

                if ('message' in response) {
                    // Type guard for ErrorResponse
                    if (response.message === 'User not authenticated.') {
                        router.push('/login');
                    } else {
                        setError(response.message || 'An unexpected error occurred.');
                    }
                } else {
                    // TypeScript now knows this is a SuccessResponse
                    setData(response);
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
        <ActivityClientPage
            currentUser={data.currentUser}
            myTasks={data.myTasks.map(item => item.content as HydratedTask)}
            createdTasks={data.createdTasks.map(item => item.content as HydratedTask)}
            projects={data.projects}
            users={data.users}
            updateTask={updateTask}
            deleteTask={deleteTask}
        />
    );
}
