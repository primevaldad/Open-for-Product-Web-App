'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { SidebarProvider, SidebarInset, SidebarToggle } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { NotificationBell } from '@/components/NotificationBell';
import { DynamicHeader } from '@/components/dynamic-header';
import type { User } from '@/lib/types';

interface ResponsiveLayoutProps {
  serverUser: User | null;
  children: ReactNode;
  notifications: ReactNode;
  hasNewFeedItems?: boolean;
}

export function ResponsiveLayout({ serverUser, children, notifications, hasNewFeedItems }: ResponsiveLayoutProps) {
  const { currentUser: clientUser } = useAuth();
  
  // A user is considered authenticated if either the server-side check 
  // or the client-side live session finds a valid user doc.
  const user = clientUser || serverUser;
  const isAuthenticated = user && user.role !== 'guest';

  if (isAuthenticated) {
    return (
      <SidebarProvider>
        <div className="flex h-full min-h-screen w-full bg-background">
          <AppSidebar user={user} hasNewCommunityContent={hasNewFeedItems} />
          <SidebarInset className="flex flex-col flex-1 rounded-tl-xl">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-background/80 px-4 py-2 shadow-sm backdrop-blur-sm md:px-6">
              <div className="flex items-center gap-4">
                <SidebarToggle />
                <Link href="/">
                  <Logo />
                </Link>
                <DynamicHeader />
              </div>
              <div className="flex items-center gap-4">
                {notifications}
                <UserNav currentUser={user} />
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Guest (Unauthenticated) Layout
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-2 backdrop-blur-sm md:px-6">
        <Link href="/" className="flex items-center gap-4">
          <Logo />
          <h1 className="text-lg font-semibold">Open for Product</h1>
        </Link>
        <UserNav currentUser={user} />
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
