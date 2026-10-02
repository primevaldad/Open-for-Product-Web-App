import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';

/**
 * Root page for app.openforproduct.com:
 * - Authenticated users are routed directly into the app dashboard (/projects).
 * - Unauthenticated visitors are redirected to the marketing homepage at openforproduct.com.
 */
export default async function RootPage() {
  const currentUser = await getAuthenticatedUser();

  if (currentUser) {
    redirect('/projects');
  }

  const marketingUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://openforproduct.com';

  redirect(marketingUrl);
}