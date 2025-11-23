
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { MarkdownEditor } from '@/components/markdown-editor';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, Tag, ProjectTag } from '@/lib/types';
import AdvancedTagSelector from '@/components/tags/advanced-tag-selector';

const onboardingSchema = z.object({
  id: z.string().min(1, { message: 'User ID is required.' }),
  name: z.string().min(1, { message: 'Name is required.' }),
  bio: z.string().optional(),
  tags: z.array(z.object({
    id: z.string(),
    display: z.string(),
    type: z.string(),
    isCategory: z.boolean().optional(),
  })).min(1, { message: 'Please select at least one tag.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
    newUser: User;
    allTags: Tag[];
    updateOnboardingInfo: (values: any) => Promise<{ success: boolean; error?: string }>;
}

export default function OnboardingForm({ newUser, allTags, updateOnboardingInfo }: OnboardingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      id: newUser.id,
      name: newUser.name || '',
      bio: newUser.bio || '',
      tags: [],
    },
  });

  function onSubmit(data: OnboardingFormValues) {
    startTransition(async () => {
        const result = await updateOnboardingInfo({
          ...data,
          interests: data.tags.map(t => t.id),
        });

        if (result.success) {
            toast({
                title: "Welcome to Open for Product!",
                description: "Your profile has been set up.",
            });
            router.push('/');
        } else {
            toast({
                variant: "destructive",
                title: "Something went wrong.",
                description: result.error,
            });
        }
    });
  }

  function handleTagsChange(newTags: ProjectTag[]) {
    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
    form.trigger('tags');
  }

  return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome aboard!</CardTitle>
          <CardDescription>
            Let&apos;s get your profile set up so you can start connecting with projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="What should we call you?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Bio</FormLabel>
                    <FormControl>
                      <MarkdownEditor
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Tell us a little about yourself, your skills, and what you're passionate about."
                      />
                    </FormControl>
                     <FormDescription>
                      This will be displayed on your public profile. You can use Markdown for formatting.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <AdvancedTagSelector 
                            id="tags" 
                            availableTags={allTags} 
                            value={field.value as ProjectTag[]} 
                            onChange={handleTagsChange}
                          />
                        </FormControl>
                        <FormDescription>
                        What topics are you passionate about?
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
               />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Complete Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
