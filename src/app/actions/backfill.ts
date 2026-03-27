'use server';

import { adminDb } from '@/lib/data.server';
import { generateProjectEmbedding } from '@/lib/ai.server';
import { FieldValue } from 'firebase-admin/firestore';
import { Project, ServerActionResponse } from '@/lib/types';
import { getAuthenticatedUser } from '@/lib/session.server';

export async function backfillProjectEmbeddings(): Promise<ServerActionResponse<{ count: number }>> {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return { success: false, error: 'Authentication required.' };
  
  // Basic security: only allow leads/experts to backfill if we had a specific role, 
  // but for now let's just ensure they are logged in.
  
  try {
    const projectsSnap = await adminDb.collection('projects')
      .where('status', '==', 'published')
      .get();
    
    if (projectsSnap.empty) {
      return { success: true, data: { count: 0 } };
    }

    let count = 0;
    const batch = adminDb.batch();

    for (const doc of projectsSnap.docs) {
      const data = doc.data() as Project;
      
      // Only backfill if embedding is missing
      if (!data.embedding) {
        const textToEmbed = [
          data.name,
          data.tagline,
          data.description,
          (data.contributionNeeds || []).join(', '),
          (data.tags || []).map(t => t.display).join(' ')
        ].join('\n');

        const embedding = await generateProjectEmbedding(textToEmbed);
        if (embedding) {
          batch.update(doc.ref, {
            embedding: (FieldValue as any).vector(embedding),
            updatedAt: new Date().toISOString()
          });
          count++;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, data: { count } };
  } catch (error) {
    console.error('Backfill failed:', error);
    return { success: false, error: 'An unexpected error occurred during backfill.' };
  }
}
