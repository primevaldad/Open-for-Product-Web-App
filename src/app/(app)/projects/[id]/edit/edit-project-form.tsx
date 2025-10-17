
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
import TagSelector from "@/components/tags/tag-selector";
import { EditProjectSchema, EditProjectFormValues } from "@/lib/schemas";
import type { HydratedProject, ServerActionResponse, Tag } from "@/lib/types";
import { toast } from 'sonner';
import { updateProject } from "@/app/actions/projects";

interface EditProjectFormProps {
    project: HydratedProject;
    allTags: Tag[];
}

export default function EditProjectForm({ project, allTags }: EditProjectFormProps) {
    
    const form = useForm<EditProjectFormValues>({
        resolver: zodResolver(EditProjectSchema),
        defaultValues: {
            id: project.id,
            name: project.name,
            tagline: project.tagline,
            description: project.description,
            contributionNeeds: Array.isArray(project.contributionNeeds) 
                ? project.contributionNeeds.join(', ') 
                : '',
            tags: project.tags || [],
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

                <Button type="submit">Save Changes</Button>
            </form>
        </Form>
    );
}

