
'use client';

import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { TagSelector } from '@/components/tags/tag-selector';
import { updateProject } from '@/app/actions/projects'; // Direct import
import type { Project, Tag as GlobalTag } from '@/lib/types';
import { EditProjectSchema, EditProjectFormValues } from '@/lib/schemas';

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// --- Component Props ---
interface EditProjectFormProps {
    project: Project;
    allTags: GlobalTag[];
}

// --- EditProjectForm Component ---
export default function EditProjectForm({ project, allTags }: EditProjectFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(EditProjectSchema),
    defaultValues: {
        id: project.id,
        name: project.name,
        tagline: project.tagline,
        description: project.description,
        contributionNeeds: Array.isArray(project.contributionNeeds) ? project.contributionNeeds.join(', ') : '',
        timeline: project.timeline,
        governance: project.governance ?? { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
        tags: project.tags ?? [],
    },
    mode: 'onChange',
  });
  
  const handleUpdateProject = (values: EditProjectFormValues) => {
    startTransition(async () => {
      const result = await updateProject(values);
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error Updating Project', description: result.error });
      } else {
        toast({ title: 'Project Updated!', description: 'Your changes have been successfully saved.' });
        router.push(`/projects/${project.id}`);
        router.refresh(); // Refresh the page to show the latest data
      }
    });
  };
  
  const governanceValues = form.watch("governance");
  const governanceTotal = governanceValues ? (governanceValues.contributorsShare + governanceValues.communityShare + governanceValues.sustainabilityShare) : 0;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>Update the core information for your project.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdateProject)} className="space-y-8">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="tagline" render={({ field }) => (<FormItem><FormLabel>Tagline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                     <TagSelector 
                        value={field.value}
                        onChange={field.onChange}
                        allTags={allTags}
                      />
                  </FormControl>
                  <FormDescription>Add up to 3 category tags for classification. Add relational tags for discovery.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Full Description</FormLabel><FormControl><div data-color-mode="light"><MDEditor value={field.value} onChange={(v) => field.onChange(v || '')} height={300} /></div></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="timeline" render={({ field }) => (<FormItem><FormLabel>Timeline</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="contributionNeeds" render={({ field }) => (<FormItem><FormLabel>Contribution Needs</FormLabel><FormControl><Input placeholder="Enter skills needed, comma-separated" {...field} /></FormControl><FormMessage /></FormItem>)} />

            <Card>
                <CardHeader>
                    <CardTitle>Governance</CardTitle>
                    <CardDescription>Adjust value distribution. Must total 100%.</CardDescription>
                     {form.formState.errors.governance && (<p className="text-sm font-medium text-destructive">{form.formState.errors.governance.message}</p>)}
                     {governanceTotal !== 100 && (<p className="text-sm font-medium text-amber-600">Current total: {governanceTotal}%</p>)}
                </CardHeader>
                <CardContent className="space-y-6">
                     <Controller control={form.control} name="governance.contributorsShare" render={({ field }) => (<FormItem><FormLabel>Contributors Share: {field.value}%</FormLabel><FormControl><Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} max={100} step={1} /></FormControl></FormItem>)} />
                     <Controller control={form.control} name="governance.communityShare" render={({ field }) => (<FormItem><FormLabel>Community Growth Stake: {field.value}%</FormLabel><FormControl><Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} max={100} step={1} /></FormControl></FormItem>)} />
                     <Controller control={form.control} name="governance.sustainabilityShare" render={({ field }) => (<FormItem><FormLabel>Sustainability (Burn): {field.value}%</FormLabel><FormControl><Slider value={[field.value]} onValueChange={(v) => field.onChange(v[0])} max={100} step={1} /></FormControl></FormItem>)} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Link href={`/projects/${project.id}`}><Button type="button" variant="outline">Cancel</Button></Link>
                <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
