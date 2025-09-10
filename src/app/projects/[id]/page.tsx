
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
import { notFound } from "next/navigation";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProjectDetailClientPage from "./project-detail-client-page";
import { getAuthenticatedUser } from "@/lib/session.server";
import {
  findProjectById,
  findTasksByProjectId,
  getAllUsers,
} from "@/lib/data.server";
import {
  addTask,
  addDiscussionComment,
  addTeamMember,
  deleteTask,
  joinProject,
  updateTask,
} from "@/app/actions/projects";
import type { Task } from "@/lib/types";

// This is now a Server Component responsible for fetching all necessary data
export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  // getAuthenticatedUser will redirect if the user is not logged in.
  const currentUser = await getAuthenticatedUser();
  const project = await findProjectById(params.id);

  if (!project) {
    notFound();
  }

  // Fetch all users and tasks for the project
  const allUsers = await getAllUsers();
  const projectTasksData = await findTasksByProjectId(params.id);

  // Hydrate tasks with their assigned user objects
  const taskPromises = projectTasksData.map(async (t) => {
    const assignedTo = t.assignedToId
      ? allUsers.find((u) => u.id === t.assignedToId)
      : undefined;
    return { ...t, description: t.description ?? '', assignedTo };
  });

  const projectTasks = (await Promise.all(taskPromises)) as Task[];

  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30"
            >
              <LayoutPanelLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold text-foreground">
              Open for Product
            </span>
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
                    <AvatarImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                    />
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
      {/* The main content is now a client component that receives data as props */}
      <ProjectDetailClientPage
        project={project}
        projectTasks={projectTasks}
        currentUser={currentUser}
        allUsers={allUsers}
        joinProject={joinProject}
        addTeamMember={addTeamMember}
        addDiscussionComment={addDiscussionComment}
        addTask={addTask}
        updateTask={updateTask}
        deleteTask={deleteTask}
      />
    </div>
  );
}
