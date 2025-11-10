
import LoginPageClient from './login-page-client';
import { getAuthenticatedUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';

// This is a Server Component that handles initial session check
export default async function LoginPage() {
  const currentUser = await getAuthenticatedUser();

  // If the user has a valid session and is NOT a guest, redirect them away.
  // A guest user should be able to see this page to log in.
  if (currentUser && currentUser.role !== 'guest') {
    redirect('/home');
  }

  // If there is no valid session, or if the user is a guest, render the client-side login form.
  return <LoginPageClient />;
}
