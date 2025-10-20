
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
import TagSelector from "@/components/tags/tag-selector";
import { EditProjectSchema, EditProjectFormValues } from "@/lib/schemas";
import type { HydratedProject, Tag, ProjectTag } from "@/lib/types";
import { toast } from 'sonner';
import { updateProject, publishProject } from "@/app/actions/projects";
import MarkdownEditor from "@/components/ui/markdown-editor";
import { useRouter } from 'next/navigation';

interface EditProjectFormProps {
    project: HydratedProject;
    allTags: Tag[];
}

export default function EditProjectForm({ project, allTags }: EditProjectFormProps) {
    const router = useRouter();

    // --- Data Sanitization ---
    // This is the crucial step. We ensure that the data passed to the form
    // strictly adheres to the ProjectTag schema, preventing type errors downstream.
    const sanitizedTags = project.tags?.filter(
        (tag): tag is ProjectTag => !!tag.id && !!tag.display && !!tag.type
    ) || [];

    const form = useForm<EditProjectFormValues>({
        resolver: zodResolver(EditProjectSchema),
        // Use the project data to populate the form's default state.
        defaultValues: {
            id: project.id,
            name: project.name || '',
            tagline: project.tagline || '',
            description: project.description || '',
            photoUrl: project.photoUrl || '',
            contributionNeeds: Array.isArray(project.contributionNeeds)
                ? project.contributionNeeds.join(', ')
                : '',
            // Use the sanitized tags for a clean initial form state.
            tags: sanitizedTags,
            governance: project.governance || { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
        },
    });

    // --- Submission Handler ---
    async function onSubmit(values: EditProjectFormValues) {
        const result = await updateProject(values);
        if (result.success) {
            toast.success("Project updated successfully!");
        } else {
            toast.error(`Update failed: ${result.error}`);
        }
    }

    // --- Publish Handler ---
    async function handlePublish() {
        const result = await publishProject(project.id);
        if (result.success) {
            toast.success("Project published successfully!");
            router.push(`/projects/${project.id}`);
            router.refresh();
        } else {
            toast.error(`Failed to publish project: ${result.error}`);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

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
                    name="photoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Photo URL</FormLabel>
                            <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                             <FormDescription>A URL to an image for your project.</FormDescription>
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
                                    placeholder="Provide a detailed description of your project..."
                                />
                            </FormControl>
                            <FormDescription>A detailed description of your project. Markdown is supported.</FormDescription>
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
                                    tags={allTags}
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            </FormControl>
                            <FormDescription>Select up to 3 category tags. Add any other relevant tags.</FormDescription>
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
                                Comma-separated list of skills or roles you're looking for.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Action Buttons */}
                <div className="flex space-x-4">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    {project.status === 'draft' && (
                        <Button type="button" onClick={handlePublish} variant="secondary">Publish</Button>
                    )}
                </div>
            </form>
        </Form>
    );
}
