
'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import type { updateUserSettings } from '@/app/actions/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TagSelector } from '@/components/tags/tag-selector';
import { useTransition } from 'react';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  bio: z.string().max(160).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface SettingsFormProps {
  currentUser: User;
  updateUserSettings: typeof updateUserSettings;
}

// This is the Client Component that now contains all the UI logic.
export default function SettingsForm({ currentUser, updateUserSettings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name || '',
      bio: currentUser.bio || '',
      interests: currentUser.interests || [],
      location: currentUser.location || '',
    },
  });

  function onSubmit(data: ProfileFormValues) {
    startTransition(async () => {
      const result = await updateUserSettings(data);
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error updating settings',
          description: result.error,
        });
      } else {
        toast({
          title: 'Settings updated!',
        });
      }
    });
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-lg font-semibold md:text-xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
            Manage your account and profile settings.
        </p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This is how others will see you on the site.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Your Name" {...field} />
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
                        You can <span>@mention</span> other users and organizations to link to them.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Interests</FormLabel>
                            <FormControl>
                                <TagSelector
                                    placeholder="Select your interests"
                                    values={field.value || []}
                                    onValuesChange={field.onChange}
                                />
                            </FormControl>
                            <FormDescription>
                                Add tags that represent your interests and skills.
                            </FormDescription>
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
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Updating..." : "Update profile"}
                </Button>
            </form>
            </Form>
        </CardContent>
      </Card>
      
    </div>
  );
}
