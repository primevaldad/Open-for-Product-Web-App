'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminDb } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { buildHybridUrl } from '@/lib/slug';
import { serializeTimestamp } from '@/lib/utils.server';
import type { FeaturedProjectCard, ServerActionResponse, Project } from '@/lib/types';

/**
 * Fetch a single project's featured card document by project ID
 */
export async function getFeaturedProjectCardAction(
  projectId: string
): Promise<ServerActionResponse<FeaturedProjectCard | null>> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  try {
    const cardDoc = await adminDb.collection('featured_projects').doc(projectId).get();
    if (!cardDoc.exists) {
      return { success: true, data: null };
    }

    const data = cardDoc.data() || {};
    const card: FeaturedProjectCard = {
      id: cardDoc.id,
      projectId: data.projectId || cardDoc.id,
      title: data.title || '',
      tagline: data.tagline || '',
      description: data.description || data.tagline || '',
      category: data.category || 'Community',
      collaborators: data.collaborators || 'Early contributors welcome',
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : null,
      visual: data.visual || null,
      urlPath: data.urlPath || '',
      published: data.published ?? true,
      projectUpdatedAt: serializeTimestamp(data.projectUpdatedAt),
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
      featuredBy: data.featuredBy || '',
    };

    return { success: true, data: card };
  } catch (error) {
    console.error('Error fetching featured project card:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch featured card.';
    return { success: false, error: message };
  }
}

/**
 * Create or update a project's feature card and mark the project featured
 */
export async function saveFeaturedProjectCardAction(data: {
  projectId: string;
  title: string;
  tagline: string;
  description?: string;
  category: string;
  collaborators: string;
  photoUrl?: string | null;
  visual?: string | null;
}): Promise<ServerActionResponse<FeaturedProjectCard>> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  try {
    const projectDoc = await adminDb.collection('projects').doc(data.projectId).get();
    if (!projectDoc.exists) {
      return { success: false, error: 'Project not found.' };
    }

    const projectData = projectDoc.data() as Project;
    const isPublic =
      (projectData.project_type === 'public' || !projectData.project_type) &&
      projectData.status === 'published';

    if (!isPublic) {
      return {
        success: false,
        error:
          'Only published, public projects can be featured. Private, personal, or draft projects cannot be featured.',
      };
    }

    const now = new Date().toISOString();
    const cardRef = adminDb.collection('featured_projects').doc(data.projectId);
    const cardSnap = await cardRef.get();
    const existingCard = cardSnap.exists ? cardSnap.data() : null;

    const trimmedTitle = data.title.trim() || projectData.name || 'Untitled Project';
    const trimmedTagline = data.tagline.trim() || projectData.tagline || '';
    const trimmedDesc = (data.description || data.tagline).trim() || trimmedTagline;
    const trimmedCategory = data.category.trim() || 'Community';
    const trimmedCollab = data.collaborators.trim() || 'Early contributors welcome';
    const cleanPhotoUrl = data.photoUrl ? data.photoUrl.trim() : null;

    const card: FeaturedProjectCard = {
      id: data.projectId,
      projectId: data.projectId,
      title: trimmedTitle,
      tagline: trimmedTagline,
      description: trimmedDesc,
      category: trimmedCategory,
      collaborators: trimmedCollab,
      photoUrl: cleanPhotoUrl,
      visual: data.visual || null,
      urlPath: buildHybridUrl('/projects', data.projectId, trimmedTitle),
      published: true,
      projectUpdatedAt: projectData.updatedAt ? serializeTimestamp(projectData.updatedAt) : now,
      createdAt: existingCard?.createdAt ? serializeTimestamp(existingCard.createdAt) : now,
      updatedAt: now,
      featuredBy: user.id,
    };

    // Save feature card document
    await cardRef.set(card, { merge: true });

    // Update project document with featured flag and timestamp
    await adminDb.collection('projects').doc(data.projectId).update({
      featured: true,
      featuredCardUpdatedAt: now,
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${data.projectId}`);
    revalidateTag('active-projects');

    return { success: true, data: card };
  } catch (error) {
    console.error('Error saving featured project card:', error);
    const message = error instanceof Error ? error.message : 'Failed to save feature card.';
    return { success: false, error: message };
  }
}

/**
 * Remove a project from featured status and unpublish its feature card
 */
export async function unfeatureProjectAction(
  projectId: string
): Promise<ServerActionResponse<{ featured: boolean }>> {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  try {
    const now = new Date().toISOString();

    // Mark project as unfeatured
    await adminDb.collection('projects').doc(projectId).update({
      featured: false,
    });

    // Mark feature card document as unpublished
    await adminDb.collection('featured_projects').doc(projectId).set(
      {
        published: false,
        updatedAt: now,
      },
      { merge: true }
    );

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidateTag('active-projects');

    return { success: true, data: { featured: false } };
  } catch (error) {
    console.error('Error unfeaturing project:', error);
    const message = error instanceof Error ? error.message : 'Failed to unfeature project.';
    return { success: false, error: message };
  }
}
