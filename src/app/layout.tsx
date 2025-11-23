
import type { Metadata } from 'next';
import './globals.css';
import '@/styles/markdown-editor.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/components/auth-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
