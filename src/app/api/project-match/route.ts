import { NextRequest, NextResponse } from 'next/server';
import { createProjectMatchThreadAction } from '@/app/actions/project-match';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '');
  const interests = String(formData.get('interests') || '');
  const contribution = String(formData.get('contribution') || '');
  const requesterName = String(formData.get('requesterName') || '');
  const notes = String(formData.get('notes') || '');

  const result = await createProjectMatchThreadAction({
    email,
    interests,
    contribution,
    requesterName: requesterName || undefined,
    notes: notes || undefined,
  });

  if (!result.success) {
    const url = new URL('/?match=error', request.url);
    url.searchParams.set('message', result.error || 'Unable to submit request.');
    return NextResponse.redirect(url, { status: 303 });
  }

  const url = new URL('/match/thanks', request.url);
  url.searchParams.set('threadId', result.data?.threadId || '');
  return NextResponse.redirect(url, { status: 303 });
}
