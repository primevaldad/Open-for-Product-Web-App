
import { getAuthenticatedUser } from '@/lib/session.server';
import { AuthProvider } from '@/components/auth-provider';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { UserNav } from '@/components/user-nav';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';

export default async function AppLayout({
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
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
        <AuthProvider serverUser={currentUser}>
        <SidebarProvider>
            <div className="flex h-full min-h-screen w-full bg-background">
            <AppSidebar user={currentUser} />
            <SidebarInset className="flex flex-col flex-1 rounded-tl-xl">
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 bg-background/80 px-4 shadow-sm backdrop-blur-sm md:px-6">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="hidden text-lg font-semibold md:block">
                    Project Discovery
                    </h1>
                </div>
                <UserNav currentUser={currentUser} />
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    {children}
                </main>
            </SidebarInset>
            </div>
        </SidebarProvider>
        </AuthProvider>
    </ThemeProvider>
  );
}
