'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { publishProject, saveProjectDraft } from "../actions/projects";
import { useTransition, type FC } from "react";

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

export const CreateProjectForm: FC = () => {
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