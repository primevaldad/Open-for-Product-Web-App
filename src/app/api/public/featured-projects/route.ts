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
    const projectsRef = adminDb.collection('projects');
    
    // Fetch explicitly featured published projects
    const featuredSnap = await projectsRef
      .where('status', '==', 'published')
      .where('featured', '==', true)
      .limit(12)
      .get();

    // Format public-safe JSON payload
    const projects = featuredSnap.docs.map(doc => {
      const data = doc.data();
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
      const categoryTag = tags.find(t => t.isCategory)?.display || tags[0]?.display || 'Community';
      const collaboratorsText = contributionNeeds.length > 0 
        ? contributionNeeds.slice(0, 2).join(', ') 
        : `${Math.max(team.length, 1)} collaborator${team.length === 1 ? '' : 's'}`;

      return {
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
      };
    });

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
