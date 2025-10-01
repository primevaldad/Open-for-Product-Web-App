
import LoginPageClient from './login-page-client';
import { getCurrentUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';

// This is a Server Component that handles initial session check
export default async function LoginPage() {
  const currentUser = await getCurrentUser();

  // If the user has a valid session cookie and their user data can be fetched,
  // redirect them to the home page immediately.
  if (currentUser) {
    redirect('/home');
  }

  // If there is no valid session, render the client-side login form.
  return <LoginPageClient />;
}
