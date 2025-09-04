
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
import type { User, Project, Task, LearningPath, UserLearningProgress, Module } from "@/lib/types";
import { getCurrentUser, hydrateProjectTeam, getAllProjects, getAllTasks, getAllUsers, getAllUserLearningProgress, getAllLearningPaths } from "@/lib/data-cache";
import ActivityClientPage from "./activity-client-page";
import { updateTask, deleteTask } from "../actions/projects";
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';

async function getActivityPageData() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { currentUser: null, projects: [], myTasks: [], learningPaths: [], userProgress: [] };

    const allUsers = await getAllUsers();
    const projectPromises = (await getAllProjects()).map(p => hydrateProjectTeam(p));
    const projects = await Promise.all(projectPromises);
    
    const taskPromises = (await getAllTasks())
        .filter(t => t.assignedToId === currentUser.id)
        .map(async t => {
            const assignedTo = allUsers.find(u => u.id === t.assignedToId);
            return { ...t, assignedTo };
        });

    const myTasks = await Promise.all(taskPromises) as Task[];

    const userProgress = await getAllUserLearningProgress();
    const filteredUserProgress = userProgress.filter(p => p.userId === currentUser.id);

    const learningPaths = (await getAllLearningPaths()).map(lp => ({
        ...lp,
        Icon: iconMap[lp.category as keyof typeof iconMap] || FlaskConical,
    }));

    return { currentUser, projects, myTasks, learningPaths, userProgress: filteredUserProgress };
}


// This page is now a Server Component that fetches data and passes it to a Client Component.
export default async function ActivityPage() {
  const { currentUser, projects, myTasks, learningPaths, userProgress } = await getActivityPageData();

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading activity...</p>
      </div>
    );
  }

  const completedModulesData = (userProgress || []).flatMap(progress =>
    (progress.completedModules || []).map(moduleId => {
      const path = learningPaths.find(p => p.id === progress.pathId);
      const module = path?.modules.find(m => m.id === moduleId);

      const serializablePath = path ? { id: path.id, title: path.title } : undefined;

      return { path: serializablePath, module };
    })
  ).filter((item): item is { path: { id: string; title: string; }; module: Module; } => !!(item.path && item.module));


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
          <UserNav currentUser={currentUser} />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 grid md:grid-cols-2 gap-6">
            <ActivityClientPage
                myTasks={myTasks}
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
