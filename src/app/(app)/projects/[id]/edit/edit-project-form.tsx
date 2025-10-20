
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
import type { HydratedProject, ServerActionResponse, Tag, ProjectTag } from "@/lib/types";
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

    const sanitizedTags = project.tags
        ?.map(tag => {
            if (tag && tag.id && tag.display && tag.type) {
                return tag;
            }
            return null;
        })
        .filter((tag): tag is ProjectTag => tag !== null);

    const form = useForm<EditProjectFormValues>({
        resolver: zodResolver(EditProjectSchema),
        defaultValues: {
            id: project.id,
            name: project.name,
            tagline: project.tagline,
            description: project.description,
            photoUrl: project.photoUrl || '',
            contributionNeeds: Array.isArray(project.contributionNeeds) 
                ? project.contributionNeeds.join(', ') 
                : '',
            tags: sanitizedTags || [],
            governance: project.governance || { contributorsShare: 75, communityShare: 10, sustainabilityShare: 15 },
        },
    });

    async function onSubmit(values: EditProjectFormValues) {
        const result = await updateProject(values);
        if (result.success) {
            toast.success("Project updated successfully!");
        } else {
            toast.error(`Update failed: ${result.error}`);
        }
    }

    async function handlePublish() {
        const result = await publishProject(project.id);
        if (result.success) {
            toast.success("Project published successfully!");
            router.push(`/projects/${project.id}`);
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <MarkdownEditor 
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Provide a detailed description of your project..."
                                />
                            </FormControl>
                            <FormDescription>A detailed description of your project, including its goals, features, and technology stack. Markdown is supported.</FormDescription>
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
                            <FormDescription>Select or create tags for your project.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex space-x-4">
                    <Button type="submit">Save Changes</Button>
                    {project.status === 'draft' && (
                        <Button type="button" onClick={handlePublish} variant="secondary">Publish</Button>
                    )}
                </div>
            </form>
        </Form>
    );
}
