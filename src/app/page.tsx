
import {
  Activity,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { Project, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { SuggestSteps } from "@/components/ai/suggest-steps";
import { getCurrentUser, hydrateProjectTeam } from "@/lib/data-cache";
import HomeClientPage from "./home-client-page";
import { mockProjects } from "@/lib/mock-data";

function getDashboardPageData() {
    const currentUser = getCurrentUser();
    
    const projects = mockProjects
        .filter(p => p.status === 'published')
        .map(p => hydrateProjectTeam(p));

    return {
        currentUser,
        projects
    }
}


// This is now a Server Component that fetches data and passes it to a client component.
export default function DashboardPage() {
  const { currentUser, projects } = getDashboardPageData();
  
  if (!currentUser) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading user...</p>
        </div>
    );
  }

  const suggestedProject = projects.length > 1 ? projects[1] : projects.length === 1 ? projects[0] : null;
  
  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30">
                <LayoutPanelLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold text-foreground">Open for Product</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-4 pt-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/">
                <SidebarMenuButton isActive>
                  <Home />
                  Home
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/create">
                <SidebarMenuButton>
                  <FilePlus2 />
                  Create Project
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/drafts">
                <SidebarMenuButton>
                  <FolderKanban />
                  Drafts
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/learning">
                <SidebarMenuButton>
                  <BookOpen />
                  Learning Paths
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/activity">
                <SidebarMenuButton>
                  <Activity />
                  Activity
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/profile">
                <SidebarMenuButton>
                  <Avatar className="size-5">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    <AvatarFallback>
                      {currentUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  Profile
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings">
                <SidebarMenuButton>
                  <Settings />
                  Settings
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="hidden text-lg font-semibold md:block">
              Project Discovery
            </h1>
          </div>
          <div className="flex w-full max-w-sm items-center gap-4 md:max-w-md lg:max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="w-full rounded-full bg-muted pl-10"
              />
            </div>
          </div>
          <UserNav currentUser={currentUser} />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6">
            {suggestedProject && <SuggestSteps suggestedProject={suggestedProject} />}
          </div>
          <HomeClientPage allPublishedProjects={projects} currentUser={currentUser} />
        </main>
      </SidebarInset>
    </div>
  );
}
