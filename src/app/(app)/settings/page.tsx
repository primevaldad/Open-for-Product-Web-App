'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import SettingsForm from "./settings-form";
import { getSettingsPageData, updateUserSettings } from '@/app/actions/settings';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, Tag } from "@/lib/types";


// Define the shapes of the success and error responses from the server action
interface SuccessResponse {
    success: true;
    user: User;
    allTags: Tag[];
}

interface ErrorResponse {
    success: false;
    message: string;
}

type PageDataResponse = SuccessResponse | ErrorResponse;


// This interface is what the component's state will hold
interface PageData {
  user: User;
  allTags: Tag[];
}

export default function SettingsPage() {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            try {
                // Assert the type of the response for better type safety
                const response = await getSettingsPageData() as PageDataResponse;

                if (response.success) {
                    // This is a SuccessResponse
                    setData({ user: response.user, allTags: response.allTags });
                } else {
                    // This is an ErrorResponse
                    if (response.message === 'User not authenticated.') {
                        router.push('/login');
                    } else {
                        setError(response.message);
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
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <Separator />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
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
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>
            <Separator />
            <SettingsForm 
                currentUser={data.user} 
                allTags={data.allTags} 
                updateUserSettings={updateUserSettings} 
            />
        </div>
    );
}
