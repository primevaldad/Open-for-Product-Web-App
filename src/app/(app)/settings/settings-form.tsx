
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTransition } from 'react';

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
import AdvancedTagSelector from '@/components/tags/advanced-tag-selector';
import { useToast } from '@/hooks/use-toast';
import type { User, Tag, ProjectTag } from '@/lib/types';
import type { updateUserSettings } from '@/app/actions/settings';
import { Switch } from '@/components/ui/switch';

const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').or(z.literal('')).optional(),
  bio: z.string().max(160, 'Bio must not be longer than 160 characters.').optional(),
  tags: z.array(z.object({
    id: z.string(),
    display: z.string(),
    type: z.string(),
    isCategory: z.boolean().optional(),
  })).optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('Please enter a valid URL.').or(z.literal('')).optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

interface SettingsFormProps {
  currentUser: User;
  allTags: Tag[];
  updateUserSettings: typeof updateUserSettings;
}

export default function SettingsForm({ currentUser, allTags, updateUserSettings }: SettingsFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: currentUser.name,
      username: currentUser.username || '',
      bio: currentUser.bio || '',
      tags: currentUser.interests?.map(interest => ({ id: interest, display: interest, type: 'interest' })) || [],
      company: currentUser.company || '',
      location: currentUser.location || '',
      website: currentUser.website || '',
      aiFeaturesEnabled: currentUser.aiFeaturesEnabled || false,
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    startTransition(async () => {
        // a bit of a hack to get the data in the right shape
        const userData = {
            ...data,
            interests: data.tags?.map(t => t.id) || [],
        };
      const result = await updateUserSettings(userData);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error updating settings',
          description: result.error,
        });
      } else {
        toast({
          title: 'Settings updated!',
          description: 'Your changes have been saved.',
        });
      }
    });
  };

  function handleTagsChange(newTags: ProjectTag[]) {
    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
    form.trigger('tags');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} />
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
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a little bit about yourself"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                You can <span>@mention</span> other users and organizations.
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
                    availableTags={allTags}
                    value={field.value as ProjectTag[]}
                    onChange={handleTagsChange}
                    />
                </FormControl>
                <FormDescription>
                    Select your tags to help us recommend relevant projects. You can also create new tags.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Your company" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Your location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="Your website" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
            control={form.control}
            name="aiFeaturesEnabled"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            Enable AI Features
                        </FormLabel>
                        <FormDescription>
                            Allow AI to use your profile data to provide you with better recommendations.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Update settings'}
        </Button>
      </form>
    </Form>
  );
}
