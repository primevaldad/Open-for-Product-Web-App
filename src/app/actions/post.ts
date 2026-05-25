'use server';

import { revalidatePath } from 'next/cache';
import { createPost, updatePost, deletePost, findProjectById, findPostById } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { createAndDispatchEvent } from '@/lib/events.server';
import { EventType } from '@/lib/types';
import type { Post } from '@/lib/types';

export async function createPostAction(data: {
    projectId: string;
    title: string;
    content: string;
    tags: string[];
    broadcastToSteem: boolean;
    steemPermlink?: string;
    status?: 'draft' | 'published';
}) {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'Not authenticated' };

    const project = await findProjectById(data.projectId, user);
    if (!project) return { error: 'Project not found' };

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
            status: data.status || 'published',
        });

        revalidatePath(`/projects/${data.projectId}`);
        revalidatePath('/feed');

        return { success: true, postId };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updatePostAction(
    postId: string,
    data: {
        title: string;
        content: string;
        tags: string[];
        status: 'draft' | 'published';
        broadcastToSteem: boolean;
        steemPermlink?: string;
    }
) {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'Not authenticated' };

    const post = await findPostById(postId);
    if (!post) return { error: 'Post not found' };

    const project = await findProjectById(post.projectId, user);
    if (!project) return { error: 'Project not found' };

    const isMember = project.team.some(member => member.userId === user.id) || project.owner?.id === user.id;
    if (!isMember) return { error: 'You must be a team member to update posts.' };

    // Only the author can edit their own post
    if (post.userId !== user.id) return { error: 'Only the author can edit this post.' };

    // Stamp editedAt when a published post is being saved as published
    const isEditing = post.status === 'published' && data.status === 'published';

    try {
        await updatePost(postId, {
            title: data.title,
            content: data.content,
            tags: data.tags,
            status: data.status,
            steemStatus: data.broadcastToSteem ? 'pending' : post.steemStatus,
            steemPermlink: data.steemPermlink ?? post.steemPermlink,
            steemAuthor: data.broadcastToSteem ? user.steemUsername : post.steemAuthor,
            ...(isEditing ? { editedAt: new Date().toISOString() } : {}),
        });

        if (isEditing) {
            await createAndDispatchEvent({
                type: EventType.POST_EDITED,
                actorUserId: user.id,
                projectId: post.projectId,
                payload: { postId, title: data.title },
            });
        }

        revalidatePath(`/projects/${post.projectId}`);
        revalidatePath('/feed');

        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function deletePostAction(postId: string) {
    const user = await getAuthenticatedUser();
    if (!user) return { error: 'Not authenticated' };

    const post = await findPostById(postId);
    if (!post) return { error: 'Post not found' };

    const project = await findProjectById(post.projectId, user);
    if (!project) return { error: 'Project not found' };

    const isAuthor = post.userId === user.id;
    const isAdmin = user.role === 'admin';
    const isLead =
        project.team.some(m => m.userId === user.id && m.role === 'lead') ||
        project.owner?.id === user.id;

    if (!isAuthor && !isAdmin && !isLead) {
        return { error: 'You do not have permission to delete this post.' };
    }

    const deletedBy: 'author' | 'admin' = isAuthor ? 'author' : 'admin';

    try {
        if (post.status === 'draft') {
            // Drafts are permanently hard-deleted — no soft delete
            await deletePost(postId);
        } else {
            // Published posts: soft delete so the card placeholder is preserved
            await updatePost(postId, {
                deletedAt: new Date().toISOString(),
                deletedBy,
            });
        }

        // Audit log — DB only, never exposed to the browser console
        await createAndDispatchEvent({
            type: EventType.POST_DELETED,
            actorUserId: user.id,
            projectId: post.projectId,
            payload: { postId, title: post.title, status: post.status, deletedBy },
        });

        revalidatePath(`/projects/${post.projectId}`);
        revalidatePath('/feed');

        return { success: true, wasDraft: post.status === 'draft' };
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
