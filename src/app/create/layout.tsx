
import { getAuthenticatedUser } from '@/lib/session.server';
import { AuthProvider } from '@/components/auth-provider';
import { redirect } from 'next/navigation';

export default async function CreateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentUser;
  try {
    currentUser = await getAuthenticatedUser();
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      console.log('User not authenticated in layout, redirecting to logout.');
      redirect('/api/auth/logout');
    }
    throw error;
  }

  if (!currentUser.onboarded) {
    redirect('/onboarding');
  }

  return (
    <AuthProvider serverUser={currentUser}>
        <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
        </main>
    </AuthProvider>
  );
}
