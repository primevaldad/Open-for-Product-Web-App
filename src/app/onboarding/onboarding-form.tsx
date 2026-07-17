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
import { AvatarUpload } from '@/components/avatar-upload';

const OnboardingSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .regex(/^[a-zA-Z0-9 ]+$/, 'Username can only contain letters, numbers, and spaces.'),
  bio: z.string().max(160).optional(),
  interests: z.array(z.object({
    id: z.string(),
    display: z.string(),
    isCategory: z.boolean(),
  })).optional(),
});

type OnboardingFormValues = z.infer<typeof OnboardingSchema>;

interface OnboardingFormProps {
  user: User;
  allTags: GlobalTag[];
}

import { slugify } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export function OnboardingForm({ user, allTags }: OnboardingFormProps) {
  const router = useRouter();
  
  const userInterestTags: ProjectTag[] = Array.isArray(user.interests) ? user.interests.map((interest: any) => {
    const tagId = typeof interest === 'string' ? interest : interest.id;
    const tagDisplay = typeof interest === 'string' ? interest : interest.display;
    return {
      id: tagId,
      display: tagDisplay,
      isCategory: Boolean(allTags.find(t => t.id === tagId)?.isCategory),
    };
  }) : [];

  const defaultUsername = user.username || (user.name ? slugify(user.name) : '');

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      name: user.name || '',
      username: defaultUsername,
      bio: user.bio || '',
      interests: userInterestTags,
    },
  });

  async function onSubmit(values: OnboardingFormValues) {
    const dataToUpdate = {
      ...values,
      interests: (values.interests || []).map(tag => ({ id: tag.id, display: tag.display })),
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
    <div className="w-full max-w-2xl mx-auto space-y-8 bg-card p-8 rounded-xl border shadow-sm">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quick Setup</h1>
        <p className="text-muted-foreground">Welcome to Open for Product. Just the essentials to get you started.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="space-y-6">
            <div className="flex justify-center mb-8">
              <AvatarUpload user={user} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Optional Details</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Skip for now</span>
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are you building or looking for?"
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
                  <FormLabel>Your Interests</FormLabel>
                  <AdvancedTagSelector
                    availableTags={allTags}
                    value={(field.value || []) as ProjectTag[]}
                    onChange={field.onChange}
                  />
                  <FormDescription>
                    We'll use these to recommend relevant projects.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="pt-4">
            <Button type="submit" size="lg" className="w-full md:w-auto px-12">
              Get Started
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
