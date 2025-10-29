'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import UserSelector from '@/components/users/user-selector';
import TagSelector from '@/components/tags/tag-selector';
import ImageUpload from '@/components/ui/image-upload';
import { CreateProjectSchema, EditProjectSchema, CreateProjectFormValues, EditProjectFormValues } from '@/lib/schemas';
import type { User, Tag, Project } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { saveProjectDraft, publishProject, updateProject } from "@/app/actions/projects";

interface ProjectFormProps {
  initialData?: Project;
  users: User[];
  tags: Tag[];
}

type ProjectFormValues = CreateProjectFormValues | EditProjectFormValues;

export function ProjectForm({ initialData, users, tags }: ProjectFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!initialData;

  const uniqueTeam = initialData?.team
    ? Array.from(new Map(initialData.team.map(item => [item.userId, item])).values())
    : [];

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(isEditMode ? EditProjectSchema : CreateProjectSchema),
    defaultValues: initialData ? {
      id: initialData.id,
      name: initialData.name || '',
      tagline: initialData.tagline || '',
      description: initialData.description || '',
      photoUrl: initialData.photoUrl || '',
      contributionNeeds: Array.isArray(initialData.contributionNeeds)
        ? initialData.contributionNeeds.join(', ')
        : '',
      tags: initialData.tags ?? [],
      team: uniqueTeam,
      ...(initialData.governance && { governance: initialData.governance }),
    } : {
      name: '',
      tagline: '',
      description: '',
      photoUrl: '',
      contributionNeeds: '',
      tags: [],
      team: [],
    },
  });

  async function onSubmit(values: ProjectFormValues, action: 'save' | 'publish') {
    if (action === 'save') setIsSaving(true); else setIsPublishing(true);

    startTransition(async () => {
      try {
        if (isEditMode && initialData) {
          const result = await updateProject(values as EditProjectFormValues);
          if (result.success) {
            toast({ title: 'Project Updated', description: 'Your changes have been saved.' });
            if (action === 'publish' && initialData.status !== 'published') {
                const pubResult = await publishProject(initialData.id);
                if(pubResult.success) {
                    toast({ title: 'Project Published', description: 'Your project is now live.' });
                    router.push(`/projects/${initialData.id}`);
                } else {
                    toast({ title: 'Publishing Error', description: pubResult.error, variant: 'destructive' });
                }
            } else {
                router.refresh();
            }
          } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
        } else {
          const draftResult = await saveProjectDraft(values as CreateProjectFormValues);
          if (!draftResult.success) {
            toast({ title: 'Error', description: draftResult.error, variant: 'destructive' });
            return;
          }
          const { projectId } = draftResult.data;
          if (action === 'publish') {
            const publishResult = await publishProject(projectId);
            if (publishResult.success) {
              toast({ title: 'Project Published', description: 'Your project has been published.' });
              router.push(`/projects/${projectId}`);
            } else {
              toast({ title: 'Publishing Error', description: publishResult.error, variant: 'destructive' });
              router.push(`/projects/${projectId}/edit`);
            }
          } else {
            toast({ title: 'Draft Saved', description: 'Your project draft has been saved.' });
            router.push(`/projects/${projectId}/edit`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      } finally {
        setIsSaving(false); setIsPublishing(false);
      }
    });
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="tagline" render={({ field }) => (<FormItem><FormLabel>Tagline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Photo</FormLabel>
              <FormControl>
                <ImageUpload
                  folder={`project-images/${initialData?.id || 'new-project'}`}
                  initialImageUrl={field.value}
                  onUploadComplete={(url) => {
                    form.setValue('photoUrl', url, { shouldValidate: true, shouldDirty: true });
                  }}
                />
              </FormControl>
              <FormDescription>
                Upload an image for your project. This will be shown on the project page.
              </FormDescription>
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
                <Textarea placeholder="Describe your project in detail..." {...field} rows={8} />
              </FormControl>
              <FormDescription>A detailed description of your project.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="tags" render={({ field }) => (<FormItem><FormLabel>Tags</FormLabel><FormControl><TagSelector id="tags" availableTags={tags} value={field.value} onChange={field.onChange} /></FormControl><FormDescription>Add tags to help people discover your project.</FormDescription><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contributionNeeds" render={({ field }) => (<FormItem><FormLabel>Contribution Needs</FormLabel><FormControl><Input placeholder="e.g., UI/UX, Backend" {...field} /></FormControl><FormDescription>What kind of help are you looking for? (comma-separated)</FormDescription><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="team" render={({ field }) => (<FormItem><FormLabel>Team Members</FormLabel><FormControl><UserSelector id="team" users={users} value={field.value} onChange={field.onChange}/></FormControl><FormDescription>{isEditMode ? 'Manage the project team.' : 'You will be added as project lead.'}</FormDescription><FormMessage /></FormItem>)} />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => form.handleSubmit((values) => onSubmit(values, 'save'))()} disabled={isPending}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditMode ? 'Save Changes' : 'Save Draft')}</Button>
          {(!isEditMode || initialData?.status !== 'published') && (
            <Button type="button" onClick={() => form.handleSubmit((values) => onSubmit(values, 'publish'))()} disabled={isPending}>{isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Publish'}</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
