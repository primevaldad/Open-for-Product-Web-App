'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MarkdownEditor } from '@/components/markdown-editor';
import UserSelector from '@/components/users/user-selector';
import AdvancedTagSelector from '@/components/tags/advanced-tag-selector';
import ImageUpload from '@/components/ui/image-upload';
import { CreateProjectSchema, EditProjectSchema, CreateProjectFormValues, EditProjectFormValues } from '@/lib/schemas';
import type { User, Tag, Project, ProjectTag, ProjectMember } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { saveProjectDraft, publishProject, updateProject } from "@/app/actions/projects";

interface ProjectFormProps {
  initialData?: Project;
  users: User[];
  tags: Tag[];
}

type ProjectFormValues = CreateProjectFormValues | EditProjectFormValues;

// Helper to convert Firestore Timestamp or string to Date
const toDate = (value: Timestamp | string | undefined): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'string') return new Date(value);
    return undefined;
};

export function ProjectForm({ initialData, users, tags }: ProjectFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!initialData;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(isEditMode ? EditProjectSchema : CreateProjectSchema),
    defaultValues: {
        name: '',
        tagline: '',
        description: '',
        project_type: 'public',
        photoUrl: '',
        contributionNeeds: '',
        tags: [],
        team: [],
    },
  });

  useEffect(() => {
    if (isEditMode && initialData) {
      
      const mappedTeam = (initialData.team || []).map(member => ({
          ...member,
          createdAt: toDate(member.createdAt),
          updatedAt: toDate(member.updatedAt),
      }));

      const uniqueTeam = Array.from(new Map(mappedTeam.map(item => [item.userId, item])).values());

      form.reset({
        id: initialData.id,
        name: initialData.name || '',
        tagline: initialData.tagline || '',
        description: initialData.description || '',
        project_type: initialData.project_type || 'public',
        photoUrl: initialData.photoUrl || '',
        contributionNeeds: Array.isArray(initialData.contributionNeeds)
          ? initialData.contributionNeeds.join(', ')
          : '',
        tags: initialData.tags ? initialData.tags.map(tag => ({ ...tag })) : [],
        team: uniqueTeam,
        governance: initialData.governance ? { ...initialData.governance } : undefined,
      });
    }
  }, [initialData, isEditMode, form]);

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

  function handleTagsChange(newTags: ProjectTag[]) {
    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
    form.trigger('tags');
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="tagline" render={({ field }) => (<FormItem><FormLabel>Tagline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField
          control={form.control}
          name="project_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Project Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="public" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Public
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="private" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Private
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="personal" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Personal
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Choose the visibility of your project.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="photoUrl">Project Photo</FormLabel>
              <FormControl>
                <ImageUpload
                  id="photoUrl"
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
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Describe your project in detail..."
                />
              </FormControl>
              <FormDescription>
                A detailed description of your project. Supports Markdown for formatting.
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
              <FormLabel htmlFor="tags">Tags</FormLabel>
              <FormControl>
                <AdvancedTagSelector 
                  id="tags" 
                  availableTags={tags} 
                  value={field.value as ProjectTag[]} 
                  onChange={handleTagsChange} 
                  isProject // Enable project-specific features
                />
              </FormControl>
              <FormDescription>
                Add tags to help people discover your project. You can create new tags, customize their display names, and mark up to three as primary categories.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />
        
        <FormField control={form.control} name="contributionNeeds" render={({ field }) => (<FormItem><FormLabel>Contribution Needs</FormLabel><FormControl><Input placeholder="e.g., UI/UX, Backend" {...field} /></FormControl><FormDescription>What kind of help are you looking for? (comma-separated)</FormDescription><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="team" render={({ field }) => (<FormItem><FormLabel htmlFor="team">Team Members</FormLabel><FormControl><UserSelector id="team" users={users} value={field.value} onChange={field.onChange}/></FormControl><FormDescription>{isEditMode ? 'Manage the project team.' : 'You will be added as project lead.'}</FormDescription><FormMessage /></FormItem>)} />

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
