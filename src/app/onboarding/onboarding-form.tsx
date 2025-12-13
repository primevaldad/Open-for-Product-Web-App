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
import { updateUser } from '@/app/actions/user';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, ProjectTag, GlobalTag } from '@/lib/types';
import AdvancedTagSelector from '@/components/tags/advanced-tag-selector';

const OnboardingSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores.'),
  bio: z.string().max(160).optional(),
  interests: z.array(z.object({
    id: z.string(),
    display: z.string(),
    isCategory: z.boolean(),
  })).min(1, 'Please select at least one interest.'),
});

type OnboardingFormValues = z.infer<typeof OnboardingSchema>;

interface OnboardingFormProps {
  user: User;
  allTags: GlobalTag[];
}

export function OnboardingForm({ user, allTags }: OnboardingFormProps) {
  const router = useRouter();
  
  const userInterestTags: ProjectTag[] = (user.interests || []).map(interest => ({
    id: interest,
    display: interest,
    isCategory: allTags.find(t => t.id === interest)?.isCategory || false,
  }));

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      name: user.name || '',
      username: user.username || '',
      bio: user.bio || '',
      interests: userInterestTags,
    },
  });

  async function onSubmit(values: OnboardingFormValues) {
    const dataToUpdate = {
      ...values,
      interests: values.interests.map(tag => tag.id),
      onboardingCompleted: true,
    };

    const result = await updateUser(user.id, dataToUpdate);

    if (result.success) {
      toast.success('Profile updated successfully!');
      router.push('/');
    } else {
      toast.error(result.error || 'An unexpected error occurred.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Welcome! Let's get you set up.</h1>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
                <Input placeholder="john_doe" {...field} />
              </FormControl>
               <FormDescription>
                This is your unique handle on the platform.
              </FormDescription>
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
              <FormLabel>Tags</FormLabel>
              <AdvancedTagSelector
                availableTags={allTags}
                value={field.value as ProjectTag[]}
                onChange={field.onChange}
              />
              <FormDescription>
                Select tags that represent your interests. This will help us recommend relevant projects to you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Complete Profile</Button>
      </form>
    </Form>
  );
}
