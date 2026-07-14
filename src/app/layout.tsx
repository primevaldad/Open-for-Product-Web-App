
import type { Metadata } from 'next';
import './globals.css';
import '@/styles/markdown-editor.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/components/auth-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Open for Product',
  description: 'A collaborative platform for projects and professionals whose lives do not fit into traditional work structures.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
      </head>
      <body className="font-body antialiased">
        <AuthProvider serverUser={null}>
          <SidebarProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
