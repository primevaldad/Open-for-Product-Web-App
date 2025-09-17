
'use client';

import { publishProject } from '@/app/actions/projects';
import type { CreateProjectFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function TestPage() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleTestClick = () => {
        // Create a unique name every time to avoid conflicts
        const testProjectName = `Test Project ${new Date().getTime()}`;

        const staticData: CreateProjectFormValues = {
            name: testProjectName,
            tagline: 'A simple project generated for debugging purposes.',
            description: 'This is the full description of the test project. It has enough content to be considered valid by the validation schema.',
            contributionNeeds: 'Developers, Designers, Testers',
            tags: [
                { id: 'debug', display: 'Debug', role: 'category' },
                { id: 'testing', display: 'Testing', role: 'relational' }
            ]
        };

        startTransition(async () => {
            console.log("Attempting to create project with static data:", staticData);
            try {
                const result = await publishProject(staticData);
                if (result?.error) {
                    console.error("Test project creation failed:", result.error);
                    toast({
                        variant: 'destructive',
                        title: 'Test Failed',
                        description: result.error,
                    });
                } else {
                    console.log("Test project created successfully:", result);
                    toast({
                        title: 'Test Succeeded!',
                        description: `Project created with ID: ${result.projectId}`,
                    });
                }
            } catch (e: any) {
                console.error("An unexpected error occurred during the test:", e);
                 toast({
                        variant: 'destructive',
                        title: 'Unexpected Error',
                        description: e.message || 'An unknown error occurred. Check the server logs.',
                    });
            }
        });
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Project Creation Test Page</h1>
            <p className="mb-4">
                Click the button below to attempt to create a new project with static, hardcoded data. 
                This will test the `publishProject` server action directly.
                Check the browser console and the server logs for output.
            </p>
            <Button onClick={handleTestClick} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isPending ? 'Creating Test Project...' : 'Run Project Creation Test'}
            </Button>
        </div>
    );
}
