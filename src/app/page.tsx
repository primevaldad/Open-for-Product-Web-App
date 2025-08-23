
import {
  Activity,
  BookOpen,
  Briefcase,
  Code,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Paintbrush,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { currentUser, projectCategories, projects } from "@/lib/data";
import { UserNav } from "@/components/user-nav";
import ProjectCard from "@/components/project-card";
import { SuggestSteps } from "@/components/ai/suggest-steps";

export default function DashboardPage() {
  const publishedProjects = projects.filter(p => p.status === 'published');
  
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
                <SidebarMenuButton isActive>
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
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="hidden text-lg font-semibold md:block">
              Project Discovery
            </h1>
          </div>
          <div className="flex w-full max-w-sm items-center gap-4 md:max-w-md lg:max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="w-full rounded-full bg-muted pl-10"
              />
            </div>
          </div>
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6">
            <SuggestSteps />
          </div>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
            <h2 className="text-2xl font-bold tracking-tight">All Projects</h2>
            <div className="flex flex-wrap items-center gap-2">
              {projectCategories.map(({ name, icon: Icon }) => (
                <Button key={name} variant="outline" className="gap-2">
                  <Icon className="h-4 w-4" />
                  {name}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Select defaultValue="latest">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="ending-soon">Ending Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {publishedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
