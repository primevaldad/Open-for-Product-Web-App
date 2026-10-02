import { NextRequest, NextResponse } from 'next/server';
import { createProjectMatchThreadAction } from '@/app/actions/project-match';

// ---------------------------------------------------------------------------
// CORS: Allow cross-origin requests from the marketing site
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://openforproduct.com',
  'https://www.openforproduct.com',
  'https://openforproduct-marketing.web.app',
];

// In development, also allow the marketing dev server
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3001');
}

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/** Preflight handler for cross-origin JSON POSTs */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

// ---------------------------------------------------------------------------
// POST handler — accepts both formData (in-app) and JSON (marketing site)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let email: string;
  let interests: string;
  let contribution: string;
  let requesterName: string;
  let notes: string;

  if (isJson) {
    // Cross-origin JSON request from the marketing site
    const body = await request.json();
    email = String(body.email || '');
    interests = String(body.interests || '');
    contribution = String(body.contribution || '');
    requesterName = String(body.requesterName || '');
    notes = String(body.notes || '');
  } else {
    // Standard formData request from the in-app form
    const formData = await request.formData();
    email = String(formData.get('email') || '');
    interests = String(formData.get('interests') || '');
    contribution = String(formData.get('contribution') || '');
    requesterName = String(formData.get('requesterName') || '');
    notes = String(formData.get('notes') || '');
  }

  const result = await createProjectMatchThreadAction({
    email,
    interests,
    contribution,
    requesterName: requesterName || undefined,
    notes: notes || undefined,
  });

  // For JSON requests, return a JSON response (marketing site expects this)
  if (isJson) {
    const status = result.success ? 200 : 400;
    return NextResponse.json(
      { success: result.success, error: result.success ? undefined : result.error },
      { status, headers: corsHeaders(request) },
    );
  }

  // For formData requests, redirect as before (in-app flow)
  if (!result.success) {
    const url = new URL('/?match=error', request.url);
    url.searchParams.set('message', result.error || 'Unable to submit request.');
    return NextResponse.redirect(url, { status: 303 });
  }

  const url = new URL('/match/thanks', request.url);
  url.searchParams.set('threadId', result.data?.threadId || '');
  return NextResponse.redirect(url, { status: 303 });
}
