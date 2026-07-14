'use server';

import {
    getAllPublicCollections,
    findCollectionBySlug,
    findCollectionById,
    findCollectionsByOwner,
    hydrateCollectionData,
    createCollection as createCollectionInDb,
    updateCollection as updateCollectionInDb,
    addProjectToCollection as addProjectToCollectionInDb,
    removeProjectFromCollection as removeProjectFromCollectionInDb,
    deleteCollection as deleteCollectionInDb,
} from '@/lib/data.server';
import { extractId } from '@/lib/slug';
import { getAuthenticatedUser } from '@/lib/session.server';
import type {
    ProjectCollection,
    HydratedCollection,
    ServerActionResponse,
    CollectionCurationMode,
} from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';
import { logActivity } from './logging';
import { ActivityType, EventType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a display name to a URL-safe slug, e.g. "Open for Product Family" → "open-for-product-family" */
export async function slugify(name: string): Promise<string> {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')   // remove non-word chars except spaces and hyphens
        .replace(/[\s_]+/g, '-')    // replace spaces / underscores with hyphens
        .replace(/-+/g, '-')        // collapse consecutive hyphens
        .slice(0, 80);              // cap length
}

// ---------------------------------------------------------------------------
// Helpers for enrichment and project-based collections
// ---------------------------------------------------------------------------

async function enrichCollectionsWithOwnerAndProjects(collections: ProjectCollection[]): Promise<any[]> {
    const { findUserById } = await import('@/lib/data.server');
    const ownerIds = Array.from(new Set(collections.map(c => c.ownerId).filter(Boolean)));
    
    const ownerMap = new Map<string, { name: string; photoUrl?: string }>();
    await Promise.all(ownerIds.map(async id => {
        const user = await findUserById(id);
        if (user) {
            ownerMap.set(id, { name: user.name, photoUrl: user.avatarUrl });
        }
    }));
    
    return collections.map(c => {
        const owner = ownerMap.get(c.ownerId);
        return {
            ...c,
            ownerName: owner?.name,
            ownerPhotoUrl: owner?.photoUrl,
            projectCount: c.memberProjectIds.length,
        };
    });
}

async function getProjectAsCollections(userId?: string): Promise<any[]> {
    const { adminDb } = await import('@/lib/firebase.server');
    const { findUserById } = await import('@/lib/data.server');
    let query = adminDb.collection('projects').where('isCollection', '==', true);
    
    const snap = await query.get();
    if (snap.empty) return [];
    
    const projects = snap.docs.map(doc => {
        const data = doc.data();
        const lead = data.team?.find((m: any) => m.role === 'lead');
        const ownerId = data.ownerId || lead?.userId || '';
        return {
            id: doc.id,
            name: data.name as string,
            description: data.description ?? '',
            coverImageUrl: data.photoUrl,
            ownerId,
            visibility: (data.project_type === 'private' ? 'private' : 'public') as any,
            curationMode: 'manual' as const,
            isProjectCollection: true,
            createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : new Date(data.createdAt.seconds * 1000).toISOString()) : new Date().toISOString(),
            updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? data.updatedAt : new Date(data.updatedAt.seconds * 1000).toISOString()) : new Date().toISOString(),
            team: data.team || [],
        };
    });
    
    // Now filter by visibility / ownership
    const filtered = projects.filter(p => {
        if (userId) {
            // If checking for myCollections, we want projects where user is lead or owner
            if (p.ownerId === userId || p.team.some((m: any) => m.userId === userId && m.role === 'lead')) {
                return true;
            }
            return false;
        } else {
            // For public exploration, we want public projects
            return p.visibility === 'public';
        }
    });

    // Now fetch child project IDs for each parent project
    await Promise.all(filtered.map(async p => {
        const childSnap = await adminDb
            .collection('projects')
            .where('parentProjectId', '==', p.id)
            .get();
        (p as any).memberProjectIds = childSnap.docs.map(d => d.id);
        (p as any).projectCount = childSnap.docs.length;
    }));
    
    // Fetch owner details
    const ownerIds = Array.from(new Set(filtered.map(p => p.ownerId).filter(Boolean)));
    const ownerMap = new Map<string, { name: string; photoUrl?: string }>();
    await Promise.all(ownerIds.map(async id => {
        const user = await findUserById(id);
        if (user) {
            ownerMap.set(id, { name: user.name, photoUrl: user.avatarUrl });
        }
    }));
    
    return filtered.map(p => {
        const owner = ownerMap.get(p.ownerId);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { team, ...rest } = p;
        return {
            ...rest,
            ownerName: owner?.name,
            ownerPhotoUrl: owner?.photoUrl,
        };
    });
}

// ---------------------------------------------------------------------------
// Read actions (can be called from server or client components)
// ---------------------------------------------------------------------------

export async function getPublicCollections(): Promise<ServerActionResponse<any[]>> {
    try {
        const [collections, projectCollections] = await Promise.all([
            getAllPublicCollections().then(enrichCollectionsWithOwnerAndProjects),
            getProjectAsCollections(),
        ]);
        
        const merged = [...collections, ...projectCollections].sort((a, b) => 
            new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
        );
        
        return deepSerialize({ success: true, data: merged });
    } catch (e: any) {
        console.error('[collections] getPublicCollections error:', e);
        return { success: false, error: e.message ?? 'Failed to load collections.' };
    }
}

export async function getCollectionBySlug(
    slugOrId: string
): Promise<ServerActionResponse<HydratedCollection>> {
    try {
        const currentUser = await getAuthenticatedUser();
        const cleanId = extractId(slugOrId);
        
        let collection;
        if (cleanId) {
            collection = await findCollectionById(cleanId, currentUser?.id);
        }
        if (!collection) {
            collection = await findCollectionBySlug(slugOrId, currentUser?.id);
        }
        
        if (!collection) {
            return { success: false, error: 'Collection not found or you do not have access.' };
        }
        const hydrated = await hydrateCollectionData(collection);
        return deepSerialize({ success: true, data: hydrated });
    } catch (e: any) {
        console.error('[collections] getCollectionBySlug error:', e);
        return { success: false, error: e.message ?? 'Failed to load collection.' };
    }
}

export async function getMyCollections(): Promise<ServerActionResponse<any[]>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };
        
        const [collections, projectCollections] = await Promise.all([
            findCollectionsByOwner(currentUser.id).then(enrichCollectionsWithOwnerAndProjects),
            getProjectAsCollections(currentUser.id),
        ]);
        
        const merged = [...collections, ...projectCollections].sort((a, b) => 
            new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
        );

        return deepSerialize({ success: true, data: merged });
    } catch (e: any) {
        console.error('[collections] getMyCollections error:', e);
        return { success: false, error: e.message ?? 'Failed to load your collections.' };
    }
}

/** 
 * Returns collections a user can add projects to:
 * 1. ALL public collections (community curation)
 * 2. OWN private/unlisted collections
 */
export async function getCollectionsForCuration(): Promise<ServerActionResponse<ProjectCollection[]>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };

        const [publicCollections, myCollections] = await Promise.all([
            getAllPublicCollections(),
            findCollectionsByOwner(currentUser.id)
        ]);

        // Merge and deduplicate
        const merged = [...publicCollections];
        for (const c of myCollections) {
            if (!merged.some(pc => pc.id === c.id)) {
                merged.push(c);
            }
        }
        
        // Sort by name
        merged.sort((a, b) => a.name.localeCompare(b.name));

        return deepSerialize({ success: true, data: merged });
    } catch (e: any) {
        console.error('[collections] getCollectionsForCuration error:', e);
        return { success: false, error: 'Failed to load available collections.' };
    }
}

// ---------------------------------------------------------------------------
// Write actions
// ---------------------------------------------------------------------------

export async function createCollectionAction(input: {
    name: string;
    description: string;
    visibility: ProjectCollection['visibility'];
    coverImageUrl?: string;
    curationMode?: CollectionCurationMode;
    memberProjectIds?: string[];
}): Promise<ServerActionResponse<ProjectCollection>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser || currentUser.role === 'guest') {
            return { success: false, error: 'You must be signed in to create a collection.' };
        }

        const slug = await slugify(input.name);
        const collection = await createCollectionInDb({
            name: input.name,
            slug,
            description: input.description,
            coverImageUrl: input.coverImageUrl,
            ownerId: currentUser.id,
            visibility: input.visibility,
            curationMode: input.curationMode ?? 'manual',
            memberProjectIds: input.memberProjectIds ?? [],
        });

        // Log activity
        await logActivity({
            actorId: currentUser.id,
            type: ActivityType.CollectionCreated,
            collectionId: collection.id,
            context: {
                collectionName: collection.name
            }
        });

        // Dispatch event & notification
        const { createAndDispatchEvent } = await import('@/lib/events.server');
        await createAndDispatchEvent({
            type: EventType.COLLECTION_CREATED,
            actorUserId: currentUser.id,
            payload: {
                collectionId: collection.id,
                collectionName: collection.name,
                collectionSlug: collection.slug,
            }
        });

        return deepSerialize({ success: true, data: collection });
    } catch (e: any) {
        console.error('[collections] createCollection error:', e);
        return { success: false, error: e.message ?? 'Failed to create collection.' };
    }
}

export async function updateCollectionAction(
    collectionId: string,
    updates: {
        name?: string;
        description?: string;
        visibility?: ProjectCollection['visibility'];
        coverImageUrl?: string;
        slug?: string;
    }
): Promise<ServerActionResponse<void>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };

        // Verify ownership via slug lookup — we load by ID directly
        const snap = await (await import('@/lib/firebase.server')).adminDb
            .collection('collections')
            .doc(collectionId)
            .get();
        if (!snap.exists) return { success: false, error: 'Collection not found.' };
        if (snap.data()!.ownerId !== currentUser.id) {
            return { success: false, error: 'You do not have permission to edit this collection.' };
        }

        await updateCollectionInDb(collectionId, updates);

        // Log activity
        await logActivity({
            actorId: currentUser.id,
            type: ActivityType.CollectionUpdated,
            collectionId,
            context: {
                collectionName: updates.name ?? snap.data()!.name,
                updatedFields: Object.keys(updates)
            }
        });

        // Dispatch event & notification
        const { createAndDispatchEvent } = await import('@/lib/events.server');
        await createAndDispatchEvent({
            type: EventType.COLLECTION_UPDATED,
            actorUserId: currentUser.id,
            payload: {
                collectionId,
                collectionName: updates.name ?? snap.data()!.name,
                collectionSlug: updates.slug ?? snap.data()!.slug,
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error('[collections] updateCollection error:', e);
        return { success: false, error: e.message ?? 'Failed to update collection.' };
    }
}

export async function addProjectToCollectionAction(
    collectionId: string,
    projectId: string
): Promise<ServerActionResponse<void>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };

        const snap = await (await import('@/lib/firebase.server')).adminDb
            .collection('collections')
            .doc(collectionId)
            .get();
        if (!snap.exists) return { success: false, error: 'Collection not found.' };
        
        const data = snap.data()!;
        const isOwner = data.ownerId === currentUser.id;
        const isPublic = data.visibility === 'public';

        if (!isOwner && !isPublic) {
            return { success: false, error: 'You do not have permission to add to this collection.' };
        }

        await addProjectToCollectionInDb(collectionId, projectId);

        // Log activity
        await logActivity({
            actorId: currentUser.id,
            type: ActivityType.CollectionProjectAdded,
            collectionId,
            projectId,
            context: {
                collectionName: data.name,
            }
        });

        // Dispatch event & notification
        const { createAndDispatchEvent } = await import('@/lib/events.server');
        await createAndDispatchEvent({
            type: EventType.PROJECT_ADDED_TO_COLLECTION,
            actorUserId: currentUser.id,
            projectId,
            payload: {
                collectionId,
                collectionName: data.name,
                collectionSlug: data.slug,
                collectionOwnerId: data.ownerId,
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error('[collections] addProject error:', e);
        return { success: false, error: e.message ?? 'Failed to add project to collection.' };
    }
}

export async function removeProjectFromCollectionAction(
    collectionId: string,
    projectId: string
): Promise<ServerActionResponse<void>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };

        const snap = await (await import('@/lib/firebase.server')).adminDb
            .collection('collections')
            .doc(collectionId)
            .get();
        if (!snap.exists) return { success: false, error: 'Collection not found.' };
        if (snap.data()!.ownerId !== currentUser.id) {
            return { success: false, error: 'You do not have permission to edit this collection.' };
        }

        await removeProjectFromCollectionInDb(collectionId, projectId);

        // Log activity
        await logActivity({
            actorId: currentUser.id,
            type: ActivityType.CollectionProjectRemoved,
            collectionId,
            projectId,
            context: {
                collectionName: snap.data()!.name,
            }
        });

        // Dispatch event & notification
        const { createAndDispatchEvent } = await import('@/lib/events.server');
        await createAndDispatchEvent({
            type: EventType.PROJECT_REMOVED_FROM_COLLECTION,
            actorUserId: currentUser.id,
            projectId,
            payload: {
                collectionId,
                collectionName: snap.data()!.name,
                collectionSlug: snap.data()!.slug,
                collectionOwnerId: snap.data()!.ownerId,
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error('[collections] removeProject error:', e);
        return { success: false, error: e.message ?? 'Failed to remove project from collection.' };
    }
}

export async function deleteCollectionAction(
    collectionId: string
): Promise<ServerActionResponse<void>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };

        const snap = await (await import('@/lib/firebase.server')).adminDb
            .collection('collections')
            .doc(collectionId)
            .get();
        if (!snap.exists) return { success: false, error: 'Collection not found.' };
        if (snap.data()!.ownerId !== currentUser.id) {
            return { success: false, error: 'You do not have permission to delete this collection.' };
        }

        const collectionName = snap.data()!.name;
        await deleteCollectionInDb(collectionId);

        // Log activity
        await logActivity({
            actorId: currentUser.id,
            type: ActivityType.CollectionDeleted,
            collectionId,
            context: {
                collectionName
            }
        });

        // Dispatch event & notification
        const { createAndDispatchEvent } = await import('@/lib/events.server');
        await createAndDispatchEvent({
            type: EventType.COLLECTION_DELETED,
            actorUserId: currentUser.id,
            payload: {
                collectionId,
                collectionName,
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error('[collections] deleteCollection error:', e);
        return { success: false, error: e.message ?? 'Failed to delete collection.' };
    }
}

export async function getCollectionsContainingProject(
    projectId: string
): Promise<ServerActionResponse<{
    collections: Array<{ id: string; name: string; slug: string; ownerId: string }>;
    parentProject: { id: string; name: string } | null;
}>> {
    try {
        const { adminDb } = await import('@/lib/firebase.server');
        
        // Fetch collections
        const colSnap = await adminDb
            .collection('collections')
            .where('memberProjectIds', 'array-contains', projectId)
            .get();
            
        const collections = colSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name as string,
                slug: data.slug as string,
                ownerId: data.ownerId as string,
            };
        });

        // Fetch parent project
        const projectSnap = await adminDb.collection('projects').doc(projectId).get();
        let parentProject: { id: string; name: string } | null = null;
        
        if (projectSnap.exists) {
            const projectData = projectSnap.data();
            if (projectData && projectData.parentProjectId) {
                const parentSnap = await adminDb.collection('projects').doc(projectData.parentProjectId).get();
                if (parentSnap.exists) {
                    const parentData = parentSnap.data();
                    parentProject = {
                        id: parentSnap.id,
                        name: (parentData?.name || 'Unknown Project') as string
                    };
                }
            }
        }

        return deepSerialize({
            success: true,
            data: {
                collections,
                parentProject
            }
        });
    } catch (e: any) {
        console.error('[collections] getCollectionsContainingProject error:', e);
        return { success: false, error: e.message ?? 'Failed to load collections containing project.' };
    }
}
