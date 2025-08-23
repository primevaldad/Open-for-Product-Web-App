
import {
  Activity,
  BookOpen,
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
import { currentUser, projects, tasks } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditTaskDialog } from "@/components/edit-task-dialog";

export default function ActivityPage() {
  const myTasks = tasks.filter(task => task.assignedTo?.id === currentUser.id);

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
            My Tasks
          </h1>
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Assigned to You</CardTitle>
              <CardDescription>
                Here's a list of tasks that require your attention across all projects. Click a task to edit.
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
        </main>
      </SidebarInset>
    </div>
  );
}
