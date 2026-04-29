'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HydratedProject } from '@/lib/types';
import { acceptInviteAction } from '@/app/actions/invite';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function JoinClient({ project, token, role }: { project: HydratedProject, token: string, role: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleAccept = async () => {
        setLoading(true);
        try {
            const res = await acceptInviteAction(token);
            if (res.success) {
                toast({ title: 'Success', description: 'You have joined the project!' });
                router.push(`/projects/${project.id}`);
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Project Invitation</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
                <p className="text-gray-600 dark:text-gray-400">
                    You have been invited to join <strong>{project.name}</strong> as a <span className="capitalize font-semibold">{role}</span>.
                </p>
                {project.photoUrl && (
                    <img src={project.photoUrl} alt={project.name} className="w-24 h-24 rounded-full mx-auto object-cover" />
                )}
                <p className="text-sm italic">"{project.tagline}"</p>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => router.push('/')} disabled={loading}>Decline</Button>
                <Button onClick={handleAccept} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Accept Invitation
                </Button>
            </CardFooter>
        </Card>
    );
}
