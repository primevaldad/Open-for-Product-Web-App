import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/data.server';
import { buildHybridUrl } from '@/lib/slug';

// ---------------------------------------------------------------------------
// CORS: Allow cross-origin requests from the marketing site & dev environments
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://openforproduct.com',
  'https://www.openforproduct.com',
  'https://openforproduct-marketing.web.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: NextRequest) {
  try {
    const featuredProjects: any[] = [];
    const featuredProjectIds = new Set<string>();

    // 1. Primary: Fetch dedicated feature cards from featured_projects collection
    const featuredCardsSnap = await adminDb
      .collection('featured_projects')
      .where('published', '==', true)
      .limit(12)
      .get();

    for (const cardDoc of featuredCardsSnap.docs) {
      const card = cardDoc.data();
      const projectId = card.projectId || cardDoc.id;

      // Privacy guard: verify that the underlying project exists and is published and public
      const projectDoc = await adminDb.collection('projects').doc(projectId).get();
      if (!projectDoc.exists) continue;
      const projectData = projectDoc.data() || {};

      const isPublic =
        (projectData.project_type === 'public' || !projectData.project_type) &&
        projectData.status === 'published';

      if (!isPublic) continue;

      featuredProjectIds.add(projectId);

      const title = card.title || projectData.name || 'Untitled Project';
      const tagline = card.tagline || card.description || projectData.tagline || '';
      const description = card.description || card.tagline || projectData.description || tagline;
      const category = card.category || 'Community';
      const collaborators = card.collaborators || 'Early contributors welcome';
      const photoUrl =
        card.photoUrl !== undefined ? card.photoUrl : (projectData.photoUrl || null);

      featuredProjects.push({
        id: projectId,
        name: title,
        title,
        tagline,
        description,
        category,
        collaborators,
        photoUrl,
        visual: card.visual || null,
        tags: Array.isArray(projectData.tags) ? projectData.tags.slice(0, 3) : [],
        urlPath: card.urlPath || buildHybridUrl('/projects', projectId, title),
        featured: true,
        project_type: 'public',
        status: 'published',
      });
    }

    // 2. Fallback / Bridge: Include any projects with featured == true that don't have a feature card yet
    if (featuredProjects.length < 12) {
      const legacySnap = await adminDb
        .collection('projects')
        .where('status', '==', 'published')
        .where('featured', '==', true)
        .limit(12)
        .get();

      for (const doc of legacySnap.docs) {
        if (featuredProjectIds.has(doc.id)) continue;

        const data = doc.data();
        if (data.project_type && data.project_type !== 'public') continue;

        const tags = Array.isArray(data.tags)
          ? data.tags.slice(0, 3).map((t: any) => ({
              id: t.id || '',
              display: t.display || t.name || '',
              isCategory: !!t.isCategory,
            }))
          : [];

        const rawNeeds = data.contributionNeeds;
        let contributionNeeds: string[] = [];
        if (Array.isArray(rawNeeds)) {
          contributionNeeds = rawNeeds.filter(Boolean);
        } else if (typeof rawNeeds === 'string' && rawNeeds.trim()) {
          contributionNeeds = [rawNeeds.trim()];
        }

        const team = Array.isArray(data.team) ? data.team : [];
        const projectName = data.name || data.title || 'Untitled Project';
        const categoryTag =
          tags.find(t => t.isCategory)?.display || tags[0]?.display || 'Community';
        const collaboratorsText =
          contributionNeeds.length > 0
            ? contributionNeeds.slice(0, 2).join(', ')
            : `${Math.max(team.length, 1)} collaborator${team.length === 1 ? '' : 's'}`;

        featuredProjects.push({
          id: doc.id,
          name: projectName,
          title: projectName,
          tagline: data.tagline || data.description || '',
          description: data.tagline || data.description || '',
          category: categoryTag,
          collaborators: collaboratorsText,
          photoUrl: data.photoUrl || null,
          tags,
          contributionNeeds,
          memberCount: Math.max(team.length, 1),
          progress: typeof data.progress === 'number' ? data.progress : 0,
          featured: true,
          urlPath: buildHybridUrl('/projects', doc.id, projectName),
          project_type: 'public',
          status: 'published',
        });
      }
    }

    const projects = featuredProjects;

    return NextResponse.json(
      { success: true, count: projects.length, projects },
      {
        status: 200,
        headers: corsHeaders(request),
      }
    );
  } catch (error: any) {
    console.error('Error fetching featured projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured projects' },
      {
        status: 500,
        headers: corsHeaders(request),
      }
    );
  }
}
