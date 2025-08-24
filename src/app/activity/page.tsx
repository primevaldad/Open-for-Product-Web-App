
'use client';

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
import { useEffect, useState } from "react";
import type { User, Project, Task, LearningPath, UserLearningProgress } from "@/lib/types";

// This page remains a client component because it uses hooks for state management.
// However, data fetching needs to be robust.

export default function ActivityPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [currentUserLearningProgress, setCurrentUserLearningProgress] = useState<UserLearningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // Dynamically import data on the client. This is a temporary solution for the prototype.
      // In a real app, this would be an API call.
      const data = await import('@/lib/data');
      setCurrentUser(data.currentUser);
      setProjects(data.projects);
      setTasks(data.tasks);
      setLearningPaths(data.learningPaths);
      setCurrentUserLearningProgress(data.currentUserLearningProgress);
      setIsLoading(false);
    }
    loadData();
  }, []);


  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading activity...</p>
      </div>
    );
  }

  const myTasks = tasks.filter(task => task.assignedTo?.id === currentUser.id);

  const completedModulesData = currentUserLearningProgress.flatMap(progress => 
    progress.completedModules.map(moduleId => {
      const path = learningPaths.find(p => p.id === progress.pathId);
      const module = path?.modules.find(m => m.id === moduleId);
      return { path, module };
    })
  ).filter(item => item.path && item.module);


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
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 grid md:grid-cols-2 gap-6">
          <Card className="mx-auto max-w-3xl md:col-span-1">
            <CardHeader>
              <CardTitle>Assigned Tasks</CardTitle>
              <CardDescription>
                Here's a list of tasks that require your attention.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myTasks.length > 0 ? (
                <ul className="space-y-1">
                  {myTasks.map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    if (!project) return null;

                    return (
                      <li key={task.id}>
                        <EditTaskDialog task={task} isTeamMember={true} projectTeam={project.team}>
                           <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                            <div className="flex-grow">
                              <p className="font-semibold">{task.title}</p>
                              <p className="text-sm text-muted-foreground">
                                In project: <Link href={`/projects/${project?.id}`} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{project?.name}</Link>
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Badge variant={
                                    task.status === 'Done' ? 'secondary' :
                                    task.status === 'In Progress' ? 'default' :
                                    'outline'
                                }>{task.status}</Badge>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </div>
                           </div>
                        </EditTaskDialog>
                        <Separator />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="font-semibold">All clear!</p>
                  <p className="text-sm">You have no tasks assigned to you right now.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mx-auto max-w-3xl md:col-span-1">
            <CardHeader>
              <CardTitle>Completed Modules</CardTitle>
              <CardDescription>
                A log of your recent learning achievements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedModulesData.length > 0 ? (
                <ul className="space-y-1">
                  {completedModulesData.map(({ path, module }, index) => (
                     <li key={`${path!.id}-${module!.id}-${index}`}>
                      <div className="flex items-center gap-4 p-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-semibold">{module!.title}</p>
                          <p className="text-sm text-muted-foreground">
                            From path: <Link href={`/learning/${path!.id}`} className="font-medium text-primary hover:underline">{path!.title}</Link>
                          </p>
                        </div>
                      </div>
                      <Separator />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="font-semibold">No modules completed yet.</p>
                  <p className="text-sm">Start a learning path to see your progress here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
