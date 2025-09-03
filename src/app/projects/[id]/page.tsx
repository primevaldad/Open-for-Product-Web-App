
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
import { UserNav } from "@/components/user-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentUser, hydrateProjectTeam, findProjectById, findTasksByProjectId, getAllUsers } from "@/lib/data-cache";
import ProjectDetailClientPage from "./project-detail-client-page";
import { addTask, addDiscussionComment, addTeamMember, deleteTask, joinProject, updateTask } from "@/app/actions/projects";
import type { Task } from "@/lib/types";

function getProjectPageData(projectId: string) {
    const currentUser = getCurrentUser();
    const allUsers = getAllUsers();
    const projectData = findProjectById(projectId);

    if (!projectData) return { project: null, projectTasks: [], currentUser, allUsers: [] };

    const project = hydrateProjectTeam(projectData);

    const projectTasks = findTasksByProjectId(projectId)
        .map(t => {
            const assignedTo = t.assignedToId ? allUsers.find(u => u.id === t.assignedToId) : undefined;
            return { ...t, description: t.description ?? '', assignedTo };
        }) as Task[];

    return { project, projectTasks, currentUser, allUsers };
}


// This is now a Server Component responsible for fetching data
export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { project, projectTasks, currentUser, allUsers } = getProjectPageData(params.id);

  if (!project) {
    notFound();
    return null;
  }

  if (!currentUser) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading user...</p>
        </div>
    );
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
