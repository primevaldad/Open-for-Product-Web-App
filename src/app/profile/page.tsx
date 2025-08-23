
import {
  Activity,
  BookOpen,
  FilePlus2,
  Home,
  LayoutPanelLeft,
  Mail,
  Award,
  Share2,
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
import { currentUser, projects } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProjectCard from "@/components/project-card";
import { Separator } from "@/components/ui/separator";

const badges = [
    { name: 'First Contribution', icon: Award },
    { name: 'Community Helper', icon: Award },
    { name: 'Project Starter', icon: Award },
    { name: 'Bug Squasher', icon: Award },
    { name: 'Creative Spark', icon: Award },
]

export default function ProfilePage() {
  const user = currentUser;
  const userProjects = projects.filter(p => p.team.some(member => member.id === user.id));

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
              <SidebarMenuButton href="/profile" isActive>
                <Avatar className="size-5">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                Profile
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/settings">
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-auto">
          <div className="relative h-48 w-full bg-primary/10">
            <div className="absolute -bottom-16 left-6">
                <Avatar className="h-32 w-32 rounded-full border-4 border-background">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="woman smiling"/>
                    <AvatarFallback className="text-4xl">{user.name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
            </div>
          </div>
          <div className="p-6 pt-20 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground max-w-xl">{user.bio}</p>
            </div>
            <div className="flex gap-2">
                <Button><Mail className="mr-2 h-4 w-4" /> Message</Button>
                <Button variant="outline"><Share2 className="mr-2 h-4 w-4" /> Share Profile</Button>
            </div>
          </div>

          <div className="p-6">
            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4">Badges & Certificates</h2>
                <div className="flex flex-wrap gap-4">
                    {badges.map((badge, index) => (
                        <Card key={index} className="p-4 flex flex-col items-center justify-center gap-2 w-36 h-36 bg-accent/50">
                            <badge.icon className="h-8 w-8 text-primary" />
                            <span className="text-sm font-medium text-center">{badge.name}</span>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Contribution Portfolio</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
