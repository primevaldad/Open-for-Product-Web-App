
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
import type { User, Tag as GlobalTag } from '@/lib/types';
import type { updateUserSettings } from '@/app/actions/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { InterestSelector } from '@/components/users/interest-selector';
import { useTransition } from 'react';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  bio: z.string().max(160).optional(),
  interests: z.array(z.string()).optional(),
  location: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal(''))
,  passwordConfirmation: z.string().optional(),
}).refine(data => data.password === data.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface SettingsFormProps {
  currentUser: User;
  allTags: GlobalTag[];
  updateUserSettings: typeof updateUserSettings;
}

export default function SettingsForm({ currentUser, allTags, updateUserSettings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name || '',
      bio: currentUser.bio || '',
      interests: currentUser.interests || [],
      location: currentUser.location || '',
      email: currentUser.email || '',
      password: '',
      passwordConfirmation: '',
    },
  });

  function onSubmit(data: ProfileFormValues) {
    startTransition(async () => {
        const { passwordConfirmation, ...updateData } = data;
        if (!updateData.password) {
            delete updateData.password;
        }

        const payload = { ...updateData, id: currentUser.id };

        const result = await updateUserSettings(payload);

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
        form.reset({ ...form.getValues(), password: '', passwordConfirmation: '' });
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>This is how others will see you on the site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
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
                                    <InterestSelector
                                        placeholder="Select your interests"
                                        value={field.value || []}
                                        onChange={field.onChange}
                                        allTags={allTags}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Add tags that represent your interests and skills. This will help us recommend projects for you.
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>
                        Update your account settings. Leave password fields blank to keep your current password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} placeholder="••••••••" autoComplete="new-password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="passwordConfirmation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} placeholder="••••••••" autoComplete="new-password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
            
            <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update Settings"}
            </Button>
        </form>
    </Form>
    </div>
  );
}
