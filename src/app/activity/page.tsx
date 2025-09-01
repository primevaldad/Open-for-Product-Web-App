
import {
  Activity,
  BookOpen,
  CheckCircle,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Pencil,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import type { User, Project, Task, LearningPath, UserLearningProgress } from "@/lib/types";
import { getActivityPageData } from "@/lib/data-cache";
import ActivityClientPage from "./activity-client-page";
import { switchUser } from "../actions/auth";
import { updateTask, deleteTask } from "../actions/projects";
import { completeModule } from "../actions/learning";

// This page is now a Server Component that fetches data and passes it to a Client Component.
export default async function ActivityPage() {
  const { currentUser, projects, tasks, learningPaths, currentUserLearningProgress, users } = await getActivityPageData();

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading activity...</p>
      </div>
    );
  }

  const completedModulesData = (currentUserLearningProgress || []).flatMap(progress => 
    (progress.completedModules || []).map(moduleId => {
      const path = learningPaths.find(p => p.id === progress.pathId);
      const module = path?.modules.find(m => m.id === moduleId);
      
      const serializablePath = path ? { id: path.id, title: path.title } : undefined;

      return { path: serializablePath, module };
    })
  ).filter((item): item is { path: { id: string; title: string; }; module: any; } => !!(item.path && item.module));


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
                <SidebarMenuButton>
                  <BookOpen />
                  Learning Paths
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/activity">
                <SidebarMenuButton isActive>
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
            My Activity
          </h1>
          <UserNav currentUser={currentUser} allUsers={users} switchUser={switchUser} />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 grid md:grid-cols-2 gap-6">
            <ActivityClientPage
                myTasks={tasks}
                completedModulesData={completedModulesData}
                projects={projects}
                updateTask={updateTask}
                deleteTask={deleteTask}
            />
        </main>
      </SidebarInset>
    </div>
  );
}
