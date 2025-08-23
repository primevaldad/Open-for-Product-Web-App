
'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import { ChevronLeft } from 'lucide-react';

import { projects, currentUser } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateProject } from '@/app/actions/projects';
import { Slider } from '@/components/ui/slider';

const EditProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Creative', 'Technical', 'Community', 'Business & Enterprise', 'Learning & Research']),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
  timeline: z.string().min(1, 'Timeline is required.'),
  governance: z.object({
    contributorsShare: z.number(),
    communityShare: z.number(),
    sustainabilityShare: z.number(),
  }),
}).refine(data => {
    const total = data.governance.contributorsShare + data.governance.communityShare + data.governance.sustainabilityShare;
    return total === 100;
}, {
    message: "Governance shares must add up to 100%",
    path: ["governance"],
});


type EditProjectFormValues = z.infer<typeof EditProjectSchema>;

export default function EditProjectPage() {
  const params = useParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    notFound();
  }

  const isCurrentUserLead = project.team.some(member => member.user.id === currentUser.id && member.role === 'lead');

  if (!isCurrentUserLead) {
    // Or redirect to project page with an error message
    notFound(); 
  }
  
  const form = useForm<EditProjectFormValues>({
    resolver: zodResolver(EditProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      tagline: project.tagline,
      description: project.description,
      category: project.category,
      contributionNeeds: project.contributionNeeds.join(', '),
      timeline: project.timeline,
      governance: project.governance ?? {
        contributorsShare: 75,
        communityShare: 10,
        sustainabilityShare: 15,
      }
    }
  });

  const handleUpdateProject = (values: EditProjectFormValues) => {
    startTransition(async () => {
      const result = await updateProject(values);
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Project Updated!', description: 'Your changes have been saved.' });
      }
    });
  };

  const governanceValues = form.watch("governance");
  const governanceTotal = governanceValues.contributorsShare + governanceValues.communityShare + governanceValues.sustainabilityShare;


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href={`/projects/${project.id}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold md:text-xl">
          Edit {project.name}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Update the core information for your project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateProject)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Textarea rows={6} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
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
                        name="timeline"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Timeline</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="contributionNeeds"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contribution Needs</FormLabel>
                        <FormControl><Input placeholder="Enter skills needed, separated by commas" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Card>
                    <CardHeader>
                        <CardTitle>Governance</CardTitle>
                        <CardDescription>Adjust the value distribution for project contributions. Must total 100%.</CardDescription>
                         {form.formState.errors.governance && (
                             <p className="text-sm font-medium text-destructive">{form.formState.errors.governance.message}</p>
                         )}
                         {governanceTotal !== 100 && (
                            <p className="text-sm font-medium text-amber-600">Current total: {governanceTotal}%</p>
                         )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Controller
                            control={form.control}
                            name="governance.contributorsShare"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contributors Share: {field.value}%</FormLabel>
                                    <FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            max={100}
                                            step={1}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <Controller
                            control={form.control}
                            name="governance.communityShare"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Community Growth Stake: {field.value}%</FormLabel>
                                    <FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            max={100}
                                            step={1}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <Controller
                            control={form.control}
                            name="governance.sustainabilityShare"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sustainability (Burn): {field.value}%</FormLabel>
                                    <FormControl>
                                        <Slider
                                            value={[field.value]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            max={100}
                                            step={1}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Link href={`/projects/${project.id}`}>
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
