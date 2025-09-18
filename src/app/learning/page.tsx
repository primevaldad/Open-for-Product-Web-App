
import {
  Activity,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAllLearningPaths, getAllUserLearningProgress, getAllProjects, getAllProjectPathLinks } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import LearningClientPage from "./learning-client-page";
import { redirect } from 'next/navigation';

// Helper to serialize Firestore Timestamps
function serializeTimestamps(data: any): any {
    if (data === null || typeof data !== 'object') {
        return data;
    }
    if ('toDate' in data && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeTimestamps);
    }
    const serialized: { [key: string]: any } = {};
    for (const key in data) {
        serialized[key] = serializeTimestamps(data[key]);
    }
    return serialized;
}

async function getLearningPageData() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { currentUser: null, learningPaths: [], userProgress: [], projects: [], allProjectPathLinks: [] };
    }
    const [learningPaths, allUserProgress, projects, allProjectPathLinks] = await Promise.all([
        getAllLearningPaths(),
        getAllUserLearningProgress(),
        getAllProjects(),
        getAllProjectPathLinks(),
    ]);
    const userProgress = allUserProgress.filter(up => up.userId === currentUser.id);

    return { 
        currentUser: serializeTimestamps(currentUser), 
        learningPaths: serializeTimestamps(learningPaths), 
        userProgress: serializeTimestamps(userProgress),
        projects: serializeTimestamps(projects),
        allProjectPathLinks: serializeTimestamps(allProjectPathLinks),
    };
}


export default async function LearningPage() {
    const { currentUser, learningPaths, userProgress, projects, allProjectPathLinks } = await getLearningPageData();

    if (!currentUser) {
        redirect('/login');
    }

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
                <SidebarMenuButton>
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
                <SidebarMenuButton isActive>
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
          <h1 className="text-lg font-semibold md:text-xl">
            Learning Paths
          </h1>
          <UserNav currentUser={currentUser} />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
            <LearningClientPage
                learningPaths={learningPaths}
                userProgress={userProgress}
                projects={projects}
                allProjectPathLinks={allProjectPathLinks}
            />
        </main>
      </SidebarInset>
    </div>
  );
}
