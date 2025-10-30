
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/session.server';
import { AuthProvider } from '@/components/auth-provider';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { PageHeader } from '@/components/page-header';
import { Logo } from '@/components/logo';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentUser;
  try {
    currentUser = await getAuthenticatedUser();
  } catch (error) {
    // If user is not authenticated, we can treat them as a guest.
    currentUser = null;
  }

  // Onboarding check for authenticated users
  if (currentUser && currentUser.role !== 'guest' && !currentUser.onboardingCompleted) {
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
            {currentUser ? (
                // Authenticated User Layout
                <SidebarProvider>
                    <div className="flex h-full min-h-screen w-full bg-background">
                    <AppSidebar user={currentUser} />
                    <SidebarInset className="flex flex-col flex-1 rounded-tl-xl">
                        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 bg-background/80 px-4 shadow-sm backdrop-blur-sm md:px-6">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="md:hidden" />
                            <PageHeader />
                        </div>
                        <UserNav currentUser={currentUser} />
                        </header>
                        <main className="flex-1 overflow-auto p-4 md:p-6">
                            {children}
                        </main>
                    </SidebarInset>
                    </div>
                </SidebarProvider>
            ) : (
                // Guest (Unauthenticated) User Layout
                <div className="flex flex-col min-h-screen w-full bg-background">
                    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                        <div className="flex items-center gap-4">
                            <Logo />
                            <h1 className="text-lg font-semibold">Open for Product</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="ghost">
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/signup">Sign Up</Link>
                            </Button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            )}
        </AuthProvider>
    </ThemeProvider>
  );
}
