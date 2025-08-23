
import {
  Activity,
  BookOpen,
  FilePlus2,
  Home,
  LayoutPanelLeft,
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
import { currentUser } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CreateProjectPage() {
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
              <SidebarMenuButton href="/create" isActive>
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
              <SidebarMenuButton href="/activity">
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
              <SidebarMenuButton href="/settings">
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <h1 className="text-lg font-semibold md:text-xl">
            Publish a New Project
          </h1>
          <UserNav />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Let's build this together.</CardTitle>
              <CardDescription>
                Fill out the details of your project. Be clear and concise to attract the right contributors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input id="name" placeholder="e.g., Community Garden Initiative" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" placeholder="A short, catchy phrase that describes your project." />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                   <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="business">Business & Enterprise</SelectItem>
                      <SelectItem value="research">Learning & Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea id="description" placeholder="Describe the goals, timeline, and what makes your project unique." rows={6}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="needs">Contribution Needs</Label>
                  <Input id="needs" placeholder="Enter skills needed, separated by commas (e.g., UI/UX Design, React, Marketing)" />
                  <p className="text-sm text-muted-foreground">
                    What kind of help are you looking for?
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline">Save Draft</Button>
                    <Button>Publish Project</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
