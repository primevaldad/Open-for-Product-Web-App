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
    
    // 1. Fetch explicitly featured published projects
    const featuredSnap = await projectsRef
      .where('status', '==', 'published')
      .where('featured', '==', true)
      .limit(12)
      .get();

    const featuredDocs = featuredSnap.docs;

    // 2. If fewer than 3 featured projects exist, backfill with recent published public projects
    let allDocs = [...featuredDocs];
    if (allDocs.length < 3) {
      const existingIds = new Set(allDocs.map(d => d.id));
      const fallbackSnap = await projectsRef
        .where('status', '==', 'published')
        .limit(10)
        .get();

      for (const doc of fallbackSnap.docs) {
        const data = doc.data();
        if (!existingIds.has(doc.id) && (data.project_type === 'public' || !data.project_type)) {
          allDocs.push(doc);
          existingIds.add(doc.id);
          if (allDocs.length >= 6) break;
        }
      }
    }

    // Format public-safe JSON payload
    const projects = allDocs.map(doc => {
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

      return {
        id: doc.id,
        name: data.name || 'Untitled Project',
        tagline: data.tagline || '',
        description: data.description || '',
        photoUrl: data.photoUrl || null,
        tags,
        contributionNeeds,
        memberCount: Math.max(team.length, 1),
        progress: typeof data.progress === 'number' ? data.progress : 0,
        featured: !!data.featured,
        urlPath: buildHybridUrl('/projects', doc.id, data.name || ''),
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
