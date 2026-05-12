'use server';

import { adminDb } from '@/lib/data.server';
import { generateProjectEmbedding } from '@/lib/ai.server';
import { FieldValue } from 'firebase-admin/firestore';
import { HydratedProject, ServerActionResponse } from '@/lib/types';
import { toHydratedProject, serializeTimestamp, deepSerialize } from '@/lib/utils.server';
import { getAllUsers } from '@/lib/data.server';

export async function searchProjectsSemantic(query: string): Promise<ServerActionResponse<HydratedProject[]>> {
  if (!query || !query.trim()) {
    return { success: true, data: [] };
  }

  try {
    const embedding = await generateProjectEmbedding(query);
    if (!embedding) {
      return { success: false, error: 'Failed to generate embedding for search query.' };
    }

    // Firestore Vector Search
    const vectorValue = (FieldValue as any).vector(embedding);
    
    const projectsRef = adminDb.collection('projects');
    const searchResult = await projectsRef
      .where('status', '==', 'published')
      .findNearest('embedding', vectorValue, {
        limit: 10,
        distanceMeasure: 'COSINE',
      })
      .get();

    if (searchResult.empty) {
      return { success: true, data: [] };
    }

    // Hydrate results
    const usersData = await getAllUsers();
    const usersMap = new Map(usersData.map((user) => [user.id, user]));

    const projects = searchResult.docs.map((doc) => {
      const data = doc.data();
      // Embedding is already handled by doc.data() destructuring or similar if we wanted, 
      // but let's be explicit.
      const { embedding, ...rest } = data;
      
      return toHydratedProject({
        ...rest,
        id: doc.id,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        startDate: serializeTimestamp(data.startDate),
        endDate: serializeTimestamp(data.endDate),
      } as any, usersMap);
    });

    return deepSerialize({ success: true, data: projects });
  } catch (error) {
    console.error('Semantic search failed:', error);
    return { success: false, error: 'An unexpected error occurred during semantic search.' };
  }
}
