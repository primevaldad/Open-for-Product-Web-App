
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { publishProject, saveProjectDraft } from "../actions/projects";
import { useTransition, useEffect, useState, type FC } from "react";
import type { User } from "@/lib/types";
import { getHydratedData } from "@/lib/data-cache";

const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Creative', 'Technical', 'Community', 'Business & Enterprise', 'Learning & Research'], {
    errorMap: () => ({ message: "Please select a category." }),
  }),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
});

type ProjectFormValues = z.infer<typeof ProjectSchema>;


const CreateProjectForm: FC = () => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      contributionNeeds: "",
    }
  });

  const handleSaveDraft = (values: ProjectFormValues) => {
    startTransition(async () => {
      const result = await saveProjectDraft(values);
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Draft Saved!', description: 'Your project has been saved as a draft.' });
      }
    });
  };

  const handlePublish = (values: ProjectFormValues) => {
    startTransition(async () => {
      const result = await publishProject(values);
       if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Let's build this together.</CardTitle>
          <CardDescription>
            Fill out the details of your project. Be clear and concise to attract the right contributors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Community Garden Initiative" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input placeholder="A short, catchy phrase that describes your project." {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Creative">Creative</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Community">Community</SelectItem>
                        <SelectItem value="Business & Enterprise">Business & Enterprise</SelectItem>
                        <SelectItem value="Learning & Research">Learning & Research</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the goals, timeline, and what makes your project unique." rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="contributionNeeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contribution Needs</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter skills needed, separated by commas (e.g., UI/UX Design, React, Marketing)" {...field} />
                    </FormControl>
                     <FormDescription>
                      What kind of help are you looking for?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={form.handleSubmit(handleSaveDraft)} disabled={isPending}>
                    {isPending ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button onClick={form.handleSubmit(handlePublish)} disabled={isPending}>
                    {isPending ? "Publishing..." : "Publish Project"}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}

// This page must be a server component to fetch data.
export default async function CreateProjectPage() {
  const { currentUser, users } = await getHydratedData();

  if (!currentUser) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading form...</p>
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
                <SidebarMenuButton isActive>
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
          <h1 className="text-lg font-semibold md:text-xl">
            Publish a New Project
          </h1>
          <UserNav currentUser={currentUser} allUsers={users} />
        </header>
        <CreateProjectForm />
      </SidebarInset>
    </div>
  );
}
