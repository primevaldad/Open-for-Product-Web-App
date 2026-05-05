
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/session.server';
import { AuthProvider } from '@/components/auth-provider';
import { SidebarProvider, SidebarInset, SidebarToggle } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { DynamicHeader } from '@/components/dynamic-header';
import { Logo } from '@/components/logo';
import { NotificationBell } from '@/components/NotificationBell';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { ResponsiveLayout } from '@/components/responsive-layout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { hasNewCommunityContent } from '@/lib/data.server';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getAuthenticatedUser();
  const hasNewFeedItems = currentUser ? await hasNewCommunityContent(
      currentUser.id, 
      currentUser.followedProjectIds || [], 
      currentUser.lastCommunityFeedSeenAt
  ) : false;

  return (
    <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
    >
        <AuthProvider serverUser={currentUser}>
            <TooltipProvider>
                <OnboardingGuard user={currentUser}>
                    <ResponsiveLayout 
                        serverUser={currentUser} 
                        notifications={<NotificationBell />}
                        hasNewFeedItems={hasNewFeedItems}
                    >
                        {children}
                    </ResponsiveLayout>
                </OnboardingGuard>
            </TooltipProvider>
        </AuthProvider>
    </ThemeProvider>
  );
}
