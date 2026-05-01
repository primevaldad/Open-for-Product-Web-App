'use server';

import {
    getAllPublicCollections,
    findCollectionBySlug,
    findCollectionsByOwner,
    hydrateCollectionData,
    createCollection as createCollectionInDb,
    updateCollection as updateCollectionInDb,
    addProjectToCollection as addProjectToCollectionInDb,
    removeProjectFromCollection as removeProjectFromCollectionInDb,
    deleteCollection as deleteCollectionInDb,
} from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type {
    ProjectCollection,
    HydratedCollection,
    ServerActionResponse,
    CollectionCurationMode,
} from '@/lib/types';
import { deepSerialize } from '@/lib/utils.server';

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
// Read actions (can be called from server or client components)
// ---------------------------------------------------------------------------

export async function getPublicCollections(): Promise<ServerActionResponse<ProjectCollection[]>> {
    try {
        const collections = await getAllPublicCollections();
        return deepSerialize({ success: true, data: collections });
    } catch (e: any) {
        console.error('[collections] getPublicCollections error:', e);
        return { success: false, error: e.message ?? 'Failed to load collections.' };
    }
}

export async function getCollectionBySlug(
    slug: string
): Promise<ServerActionResponse<HydratedCollection>> {
    try {
        const currentUser = await getAuthenticatedUser();
        const collection = await findCollectionBySlug(slug, currentUser?.id);
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

export async function getMyCollections(): Promise<ServerActionResponse<ProjectCollection[]>> {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return { success: false, error: 'You must be signed in.' };
        const collections = await findCollectionsByOwner(currentUser.id);
        return deepSerialize({ success: true, data: collections });
    } catch (e: any) {
        console.error('[collections] getMyCollections error:', e);
        return { success: false, error: e.message ?? 'Failed to load your collections.' };
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
            memberProjectIds: [],
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
        if (snap.data()!.ownerId !== currentUser.id) {
            return { success: false, error: 'You do not have permission to edit this collection.' };
        }

        await addProjectToCollectionInDb(collectionId, projectId);
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

        await deleteCollectionInDb(collectionId);
        return { success: true };
    } catch (e: any) {
        console.error('[collections] deleteCollection error:', e);
        return { success: false, error: e.message ?? 'Failed to delete collection.' };
    }
}
