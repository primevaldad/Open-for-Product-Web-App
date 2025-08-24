
"use client";

import {
  Activity,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Settings,
  Users,
  Clock,
  Target,
  FileText,
  DollarSign,
  UserPlus,
  Pencil,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummarizeProgress } from "@/components/ai/summarize-progress";
import { HighlightBlockers } from "@/components/ai/highlight-blockers";
import { joinProject } from "@/app/actions/projects";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Task, TaskStatus, User, Project } from "@/lib/types";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { AddTaskDialog } from "@/components/add-task-dialog";

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

function TaskCard({ task, isTeamMember, team }: { task: Task, isTeamMember: boolean, team: any[] }) {
  return (
    <EditTaskDialog task={task} isTeamMember={isTeamMember} projectTeam={team}>
      <Card className="mb-2 bg-card/80 hover:bg-accent cursor-pointer">
        <CardContent className="p-3">
          <p className="text-sm font-medium mb-2">{task.title}</p>
          <div className="flex items-center justify-between">
            {task.assignedTo ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} />
                      <AvatarFallback>{getInitials(task.assignedTo.name)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.assignedTo.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
                <div className="h-6 w-6" /> 
            )}
             {task.estimatedHours && (
                <Badge variant="outline" className="text-xs">
                    {task.estimatedHours}h
                </Badge>
             )}
          </div>
        </CardContent>
      </Card>
    </EditTaskDialog>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await import('@/lib/data-cache');
      const { currentUser, projects, tasks } = await data.getData();
      setCurrentUser(currentUser);
      setProject(projects.find((p) => p.id === params.id) || null);
      setTasks(tasks);
      setIsLoading(false);
    }
    loadData();
  }, [params.id]);

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading project...</p>
        </div>
    );
  }

  if (!project) {
    notFound();
    return null;
  }

  if (!currentUser) {
    // This can happen briefly while the user data is loading client-side
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading user...</p>
        </div>
    );
  }
  
  const projectTasks = tasks.filter(t => t.projectId === project.id);

  const isCurrentUserMember = project.team.some(member => member.user.id === currentUser.id);
  const isCurrentUserLead = project.team.some(member => member.user.id === currentUser.id && member.role === 'lead');

  const handleJoinProject = () => {
    startTransition(async () => {
      if (typeof params.id !== 'string') return;
      const result = await joinProject(params.id);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Welcome!', description: `You've successfully joined ${project.name}.` });
      }
    });
  };

  const taskColumns: { [key in TaskStatus]: Task[] } = {
    'To Do': projectTasks.filter(t => t.status === 'To Do'),
    'In Progress': projectTasks.filter(t => t.status === 'In Progress'),
    'Done': projectTasks.filter(t => t.status === 'Done'),
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
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.tagline}</p>
          </div>
          <div className="flex items-center gap-4">
             {!isCurrentUserMember && (
              <Button onClick={handleJoinProject} disabled={isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isPending ? 'Joining...' : 'Join Project'}
              </Button>
             )}
             <UserNav />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs defaultValue="overview">
            <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="discussions">Discussions</TabsTrigger>
                  <TabsTrigger value="governance">Governance</TabsTrigger>
                </TabsList>
                {isCurrentUserLead && (
                    <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Project
                        </Button>
                    </Link>
                )}
            </div>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center"><Target className="h-5 w-5 mr-3 text-primary" /> <span>Skills Needed: {project.contributionNeeds.join(', ')}</span></div>
                        <div className="flex items-center"><Clock className="h-5 w-5 mr-3 text-primary" /> <span>Timeline: {project.timeline}</span></div>
                        <div className="flex items-center">
                            <Users className="h-5 w-5 mr-3 text-primary" />
                            <div className="flex -space-x-2">
                              <TooltipProvider>
                                {project.team.map(member => (
                                  <Tooltip key={member.user.id}>
                                    <TooltipTrigger asChild>
                                        <Link href={`/profile/${member.user.id}`}>
                                            <Avatar className="h-8 w-8 border-2 border-background">
                                                <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                                                <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">{member.user.name}</p>
                                      <p className="capitalize text-muted-foreground">{member.role}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </TooltipProvider>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground"><span>Progress</span><span>{project.progress}%</span></div>
                            <Progress value={project.progress} />
                        </div>
                    </div>
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-2 gap-6">
                <SummarizeProgress project={project} />
                <HighlightBlockers />
              </div>
            </TabsContent>

            <TabsContent value="tasks">
                <Card>
                  <CardHeader><CardTitle>Task Board</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(Object.keys(taskColumns) as TaskStatus[]).map((status) => (
                        <div key={status} className="bg-muted/50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">{status} ({taskColumns[status].length})</h3>
                                {isCurrentUserMember && (
                                    <AddTaskDialog projectId={project.id} status={status}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </AddTaskDialog>
                                )}
                            </div>
                            <div className="space-y-2">
                                {taskColumns[status].map(task => <TaskCard key={task.id} task={task} isTeamMember={isCurrentUserMember} team={project.team} />)}
                            </div>
                        </div>
                    ))}
                  </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="discussions">
                <Card>
                    <CardHeader><CardTitle>Discussions</CardTitle><CardDescription>Coming soon...</CardDescription></CardHeader>
                    <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
                        <p>Real-time messaging is in the works!</p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="governance">
                <Card>
                    <CardHeader><CardTitle>Value & Governance</CardTitle><CardDescription>Transparent value distribution for all contributors.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-6 w-6 text-green-500" />
                                <span className="font-medium">Contributors Share</span>
                            </div>
                            <span className="text-2xl font-bold">{project.governance?.contributorsShare ?? 75}%</span>
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-blue-500" />
                                <span className="font-medium">Community Growth Stake</span>
                            </div>
                            <span className="text-2xl font-bold">{project.governance?.communityShare ?? 10}%</span>
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-purple-500" />
                                <span className="font-medium">Sustainability (Burn)</span>
                            </div>
                            <span className="text-2xl font-bold">{project.governance?.sustainabilityShare ?? 15}%</span>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}
