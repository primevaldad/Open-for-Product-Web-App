
"use client";

import {
  Activity,
  BookOpen,
  FilePlus2,
  Home,
  LayoutPanelLeft,
  Settings,
  Users,
  Clock,
  Target,
  FileText,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummarizeProgress } from "@/components/ai/summarize-progress";
import { HighlightBlockers } from "@/components/ai/highlight-blockers";
import { useAuth } from "@/components/auth-provider";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

function TaskCard({ task }: { task: (typeof tasks)[0] }) {
  return (
    <Card className="mb-2 bg-card/80">
      <CardContent className="p-3">
        <p className="text-sm font-medium mb-2">{task.title}</p>
        {task.assignedTo && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} />
              <AvatarFallback>{getInitials(task.assignedTo.name)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{task.assignedTo.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    notFound();
  }

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const taskColumns = {
    'To Do': tasks.filter(t => t.status === 'To Do'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'Done': tasks.filter(t => t.status === 'Done'),
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
              <SidebarMenuButton href="/">
                <Home />
                Home
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/create">
                <FilePlus2 />
                Create Project
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/learning">
                <BookOpen />
                Learning Paths
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Activity />
                Activity
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/profile">
                <Avatar className="size-5">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                Profile
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton>
                <Settings />
                Settings
              </SidebarMenuButton>
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
             {user ? <Button>Join Project</Button> : <Button onClick={handleLogin}>Sign in to Join</Button>}
             <UserNav />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
              <TabsTrigger value="governance">Governance</TabsTrigger>
            </TabsList>

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
                        <div className="flex items-center"><Target className="h-5 w-5 mr-3 text-primary" /> <span>Goal: {project.contributionNeeds.join(', ')}</span></div>
                        <div className="flex items-center"><Clock className="h-5 w-5 mr-3 text-primary" /> <span>Timeline: {project.timeline}</span></div>
                        <div className="flex items-center">
                            <Users className="h-5 w-5 mr-3 text-primary" />
                            <div className="flex -space-x-2">
                                {project.team.map(member => (
                                    <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                ))}
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
                    {Object.entries(taskColumns).map(([status, tasks]) => (
                        <div key={status} className="bg-muted/50 rounded-lg p-4">
                            <h3 className="font-semibold mb-4">{status} ({tasks.length})</h3>
                            <div>
                                {tasks.map(task => <TaskCard key={task.id} task={task} />)}
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
                            <span className="text-2xl font-bold">75%</span>
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6 text-blue-500" />
                                <span className="font-medium">Community Growth Stake</span>
                            </div>
                            <span className="text-2xl font-bold">10%</span>
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-purple-500" />
                                <span className="font-medium">Sustainability (Burn)</span>
                            </div>
                            <span className="text-2xl font-bold">15%</span>
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
