'use server';

import { revalidatePath } from 'next/cache';
import { createPost, updatePost, findProjectById } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type { Post } from '@/lib/types';

export async function createPostAction(data: {
    projectId: string;
    title: string;
    content: string;
    tags: string[];
    broadcastToSteem: boolean;
    steemPermlink?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'Not authenticated' };

    const project = await findProjectById(data.projectId, user);
    if (!project) return { error: 'Project not found' };

    // Check if user is a member of the project team
    const isMember = project.team.some(member => member.userId === user.id) || project.owner?.id === user.id;
    if (!isMember) return { error: 'You must be a team member to post updates.' };

    try {
        const postId = await createPost({
            projectId: data.projectId,
            userId: user.id,
            title: data.title,
            content: data.content,
            tags: data.tags,
            steemStatus: data.broadcastToSteem ? 'pending' : 'none',
            steemPermlink: data.steemPermlink,
            steemAuthor: data.broadcastToSteem ? user.steemUsername : undefined,
        });

        revalidatePath(`/projects/${data.projectId}`);
        revalidatePath('/feed');

        return { success: true, postId };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function confirmSteemBroadcastAction(postId: string, permlink: string) {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'Not authenticated' };

    try {
        await updatePost(postId, {
            steemStatus: 'confirmed',
            steemPermlink: permlink,
        });
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
