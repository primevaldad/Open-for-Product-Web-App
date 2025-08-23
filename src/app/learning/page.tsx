
'use client';

import {
  Activity,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  LayoutPanelLeft,
  Lock,
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
import { currentUser, learningPaths } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LearningPage() {
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
                <SidebarMenuButton isActive>
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
          <h1 className="text-lg font-semibold md:text-xl">
            Learning Paths
          </h1>
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Unlock Your Potential</h2>
            <p className="text-muted-foreground">Gain new skills by contributing to real projects. As you reach milestones, new paths unlock.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {learningPaths.map((path) => (
              <Link key={path.id} href={path.isLocked ? '#' : `/learning/${path.id}`} className={cn(path.isLocked && "pointer-events-none")}>
                <Card className={cn("flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1", path.isLocked && "bg-muted/50")}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <path.Icon className="h-6 w-6 text-primary" />
                      </div>
                      {path.isLocked && <Badge variant="secondary"> <Lock className="mr-1 h-3 w-3" /> Locked</Badge>}
                    </div>
                    <CardTitle className="pt-4">{path.title}</CardTitle>
                    <Badge variant="outline" className="w-fit">{path.category}</Badge>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground">{path.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{path.duration}</span>
                    <Button asChild disabled={path.isLocked}>
                        <span>Start Path</span>
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
