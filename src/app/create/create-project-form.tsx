
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UserSelector from "@/components/users/user-selector";
import TagSelector from "@/components/tags/tag-selector";
import { CreateProjectSchema, CreateProjectFormValues } from "@/lib/schemas";
import type { User, Tag } from "@/lib/types";
import { toast } from 'sonner';
import { saveProjectDraft, publishProject } from "@/app/actions/projects";

interface CreateProjectFormProps {
  users: User[];
  tags: Tag[];
}

export function CreateProjectForm(props: CreateProjectFormProps) {
  const { users, tags } = props;

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      contributionNeeds: "",
      tags: [],
      team: [],
    },
  });

  async function onSubmit(values: CreateProjectFormValues, isPublishing: boolean) {
    const action = isPublishing ? publishProject : saveProjectDraft;
    const result = await action(values);
    if (result.success) {
      toast.success(`Project successfully ${isPublishing ? 'published' : 'saved as draft'}!`);
    } else {
      toast.error(`Error: ${result.error}`);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="My Awesome Project" {...field} />
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
                <Input placeholder="A short, catchy phrase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your project in detail..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="team"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Members</FormLabel>
              <FormControl>
                <UserSelector
                  users={users}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Select users to invite to your project.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <TagSelector
                    tags={tags}
                    value={field.value}
                    onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Add tags to help people discover your project.
              </FormDescription>
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
                <Input placeholder="e.g., UI/UX Design, Backend Development" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated list of skills you're looking for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={form.handleSubmit(v => onSubmit(v, false))}>
                Save as Draft
            </Button>
            <Button type="button" onClick={form.handleSubmit(v => onSubmit(v, true))}>
                Publish Project
            </Button>
        </div>
      </form>
    </Form>
  );
}
