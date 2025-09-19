
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
  getDiscussionsByProjectId,
  getRecommendedLearningPathsForProject,
} from "@/lib/data.server";
import {
  addTask,
  addDiscussionComment,
  addTeamMember,
  deleteTask,
  joinProject,
  updateTask,
} from "@/app/actions/projects";
import type { Task, Project, Discussion, Tag, User, LearningPath } from "@/lib/types";

const toISOString = (timestamp: any): string | any => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    return timestamp;
};

// This is now a Server Component responsible for fetching all necessary data
export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  // getAuthenticatedUser will redirect if the user is not logged in.
  const rawCurrentUser = await getAuthenticatedUser();
  const rawProjectData = await findProjectById(params.id);

  if (!rawProjectData) {
    notFound();
  }

  // Fetch all raw data
  const [rawAllUsers, rawProjectTasksData, rawDiscussionData, rawRecommendedLearningPaths] = await Promise.all([
    getAllUsers(),
    findTasksByProjectId(params.id),
    getDiscussionsByProjectId(params.id),
    getRecommendedLearningPathsForProject(params.id),
  ]);

  // --- SERIALIZATION --- 
  // Convert all Firestore Timestamps to ISO strings before passing to client components

  const currentUser = {
    ...rawCurrentUser,
    createdAt: toISOString(rawCurrentUser.createdAt),
    lastLogin: toISOString(rawCurrentUser.lastLogin),
  };

  const allUsers = rawAllUsers.map(user => ({
    ...user,
    createdAt: toISOString(user.createdAt),
    lastLogin: toISOString(user.lastLogin),
  }));

  const projectTasksData = rawProjectTasksData.map(task => ({
      ...task,
      createdAt: toISOString(task.createdAt),
      updatedAt: toISOString(task.updatedAt),
  }));

  const discussionData = rawDiscussionData.map(comment => ({
      ...comment,
      timestamp: toISOString(comment.timestamp),
  }));

  const projectData = {
      ...rawProjectData,
      createdAt: toISOString(rawProjectData.createdAt),
      updatedAt: toISOString(rawProjectData.updatedAt),
      startDate: rawProjectData.startDate ? toISOString(rawProjectData.startDate) : undefined,
      endDate: rawProjectData.endDate ? toISOString(rawProjectData.endDate) : undefined,
      tags: (rawProjectData.tags || []).map(tag => ({
          ...tag,
          createdAt: toISOString(tag.createdAt),
          updatedAt: toISOString(tag.updatedAt),
      })),
  };

  const recommendedLearningPaths = rawRecommendedLearningPaths.map(path => ({
      ...path,
      createdAt: toISOString(path.createdAt),
      updatedAt: toISOString(path.updatedAt),
  }));

  // --- HYDRATION --- 
  // Hydrate data on the server using the safe, serialized data

  const projectTasks = projectTasksData.map(t => {
    const assignedTo = t.assignedToId
      ? allUsers.find((u) => u.id === t.assignedToId)
      : undefined;
    return { ...t, description: t.description ?? '', assignedTo };
  }) as Task[];

  const hydratedTeam = projectData.team.map(member => {
      const user = allUsers.find(u => u.id === member.userId);
      return user ? { ...member, user } : null;
  }).filter(Boolean) as (typeof projectData.team[0] & { user: User })[];

  const hydratedDiscussions = discussionData.map(comment => {
      const user = allUsers.find(u => u.id === comment.userId);
      return user ? { ...comment, user } : null;
  }).filter(Boolean) as (typeof discussionData[0] & { user: User })[];

  const project = {
      ...projectData,
      team: hydratedTeam,
  } as Project;


  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/home" className="flex items-center gap-2">
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
              <Link href="/home">
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
        projectDiscussions={hydratedDiscussions}
        recommendedLearningPaths={recommendedLearningPaths}
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
