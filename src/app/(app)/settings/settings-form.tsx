
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { InterestSelector } from '@/components/users/interest-selector';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import type { updateUserSettings } from '@/app/actions/settings';

// We can infer the schema from Zod and reuse it in the form
const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

interface SettingsFormProps {
  currentUser: User;
  updateUserSettings: typeof updateUserSettings;
}

export default function SettingsForm({ currentUser, updateUserSettings }: SettingsFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: currentUser.name,
      bio: currentUser.bio || '',
      interests: currentUser.interests || [],
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    startTransition(async () => {
      const result = await updateUserSettings(data);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              This is how others will see you on the site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        value={field.value}
                        onChange={field.onChange}
                      />
                  </FormControl>
                   <FormDescription>
                    Select your interests to help us recommend relevant projects and learning paths.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
