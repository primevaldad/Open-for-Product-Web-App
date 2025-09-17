
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { publishProject, saveProjectDraft } from '../actions/projects';
import { TagSelector } from '@/components/tags/tag-selector';
import type { Tag, ProjectTag } from '@/lib/types';
import { CreateProjectSchema, CreateProjectFormValues } from '@/lib/schemas';

interface CreateProjectFormProps {
  availableTags: Tag[];
}

export function CreateProjectForm({ availableTags }: CreateProjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: '',
      tagline: '',
      description: '',
      contributionNeeds: '',
      tags: [],
    },
  });

  const handleFormSubmit = async (values: CreateProjectFormValues, isDraft: boolean) => {
    const action = isDraft ? saveProjectDraft : publishProject;
    const result = await action(values);

    if (result.success && result.projectId) {
      toast({ title: `Project ${isDraft ? 'saved' : 'published'} successfully!` });
      router.push(`/projects/${result.projectId}`);
    } else {
      toast({ title: 'An error occurred', description: result.error, variant: 'destructive' });
    }
  };

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
                <Input placeholder="A short, catchy phrase for your project" {...field} />
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
                <Textarea placeholder="A detailed description of your project..." {...field} />
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
                <Textarea placeholder="What kind of help are you looking for? (e.g., frontend developers, designers, testers)" {...field} />
              </FormControl>
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
              <TagSelector
                allTags={availableTags}
                value={field.value || []}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={form.handleSubmit((values) => handleFormSubmit(values, true))}>
            Save as Draft
          </Button>
          <Button type="button" onClick={form.handleSubmit((values) => handleFormSubmit(values, false))}>
            Publish Project
          </Button>
        </div>
      </form>
    </Form>
  );
}
