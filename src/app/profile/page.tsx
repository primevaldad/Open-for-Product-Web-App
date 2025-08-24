
import {
  Activity,
  Award,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Pencil,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Separator } from '@/components/ui/separator';
import type { User, Project } from '@/lib/types';
import { getData } from '@/lib/data-cache';

const badges = [
  { name: 'First Contribution', icon: Award },
  { name: 'Community Helper', icon: Award },
  { name: 'Project Starter', icon: Award },
  { name: 'Bug Squasher', icon: Award },
  { name: 'Creative Spark', icon: Award },
];

// This is a Server Component
export default async function ProfilePage() {
  const { currentUser: user, projects } = await getData();

  const userProjects = projects.filter(
    p =>
      p.status === 'published' && p.team.some(member => member.user.id === user.id)
  );

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
                <SidebarMenuButton isActive>
                  <Avatar className="size-5">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
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
          <h1 className="text-lg font-semibold md:text-xl">My Profile</h1>
          <UserNav />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="relative h-48 w-full bg-primary/10">
            <div className="absolute -bottom-16 left-6">
              <Avatar className="h-32 w-32 rounded-full border-4 border-background">
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.name}
                  data-ai-hint="woman smiling"
                />
                <AvatarFallback className="text-4xl">
                  {user.name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="p-6 pt-20 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground max-w-xl">{user.bio}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/settings">
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-6">
            <Separator className="my-6" />

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                Badges & Certificates
              </h2>
              <div className="flex flex-wrap gap-4">
                {badges.map((badge, index) => (
                  <Card
                    key={index}
                    className="p-4 flex flex-col items-center justify-center gap-2 w-36 h-36 bg-accent/50"
                  >
                    <badge.icon className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium text-center">
                      {badge.name}
                    </span>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                Contribution Portfolio
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userProjects.map(project => (
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
