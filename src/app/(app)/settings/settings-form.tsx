
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTransition, useState } from 'react';
import { AvatarUpload } from '@/components/avatar-upload';

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
import AdvancedTagSelector from '@/components/tags/advanced-tag-selector';
import { useToast } from '@/hooks/use-toast';
import type { User, GlobalTag, ProjectTag } from '@/lib/types';
import type { updateUserSettings } from '@/app/actions/settings';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SteemKeychain } from '@/lib/steem-keychain.client';
import { getOrCreateVerificationCodeAction, verifySteemPostAction, resetSteemVerificationAction } from '@/app/actions/steem';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ShieldCheck, HelpCircle, Lock as LockIcon } from 'lucide-react';

const SettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').or(z.literal('')).optional(),
  bio: z.string().optional(),
  tags: z.array(z.object({
    id: z.string(),
    display: z.string(),
    isCategory: z.boolean().optional(),
  })).optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  steemUsername: z.string().optional(),
  steemFeedPreference: z.enum(['all', 'blog', 'none']).optional(),
  steemIconOverlay: z.boolean().optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

interface SettingsFormProps {
  currentUser: User;
  allTags: GlobalTag[];
  updateUserSettings: typeof updateUserSettings;
}

export default function SettingsForm({ currentUser, allTags, updateUserSettings }: SettingsFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: currentUser.name,
      username: currentUser.username || '',
      bio: currentUser.bio || '',
      tags: currentUser.interests?.map(interest => {
        const id = typeof interest === 'string' ? interest : interest.id;
        const display = typeof interest === 'string' ? interest : (interest.display || interest.id);
        return { id, display };
      }) || [],
      company: currentUser.company || '',
      location: currentUser.location || '',
      website: currentUser.website || '',
      steemUsername: currentUser.steemUsername || '',
      steemFeedPreference: currentUser.steemFeedPreference || 'all',
      steemIconOverlay: currentUser.steemIconOverlay || false,
      aiFeaturesEnabled: currentUser.aiFeaturesEnabled || false,
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    startTransition(async () => {
        const userData = {
            ...data,
            interests: data.tags as any,
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

  const handleVerifySteem = async () => {
    const steemUsername = form.getValues('steemUsername');
    if (!steemUsername) {
      toast({
        variant: 'destructive',
        title: 'Missing Steem Username',
        description: 'Please enter a Steem username before verifying.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Get verification code
      const codeResult = await getOrCreateVerificationCodeAction();
      if (codeResult.error) throw new Error(codeResult.error);
      const code = codeResult.code!;

      // 2. Request post from Keychain
      const permlink = `verify-${Math.random().toString(36).substring(7)}`;
      
      if (!SteemKeychain.isAvailable()) {
        throw new Error('Steem Keychain extension is not installed or enabled in this browser.');
      }

      const keychainResult = await SteemKeychain.requestPost(
        steemUsername,
        'Open for Product Verification',
        `This post verifies my account on Open for Product.\n\nVerification Code: ${code}`,
        'hive-111745',
        '',
        JSON.stringify({ tags: ['openforproduct'], app: 'openforproduct/1.0' }),
        permlink
      );

      if (!keychainResult.success) {
        throw new Error(keychainResult.message);
      }

      // 3. Verify on server
      // We pass the username to the verify action too if it needs it
      const verifyResult = await verifySteemPostAction(permlink, steemUsername);
      if (verifyResult.error) throw new Error(verifyResult.error);

      toast({
        title: 'Steem Account Verified!',
        description: 'Your identity has been successfully linked to the blockchain.',
      });
      
      // Update local state to show verified badge immediately (optional, or rely on revalidatePath)
      window.location.reload();
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  function handleTagsChange(newTags: ProjectTag[]) {
    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
    form.trigger('tags');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Avatar section — saves independently of the main form */}
        <div className="flex items-center gap-6 rounded-lg border p-4 bg-muted/30">
          <AvatarUpload user={currentUser} />
          <div className="space-y-1">
            <p className="font-semibold text-base">{currentUser.name}</p>
            {currentUser.username && (
              <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Click your avatar to upload a new photo. Supports JPG, PNG, GIF up to 5 MB.
            </p>
          </div>
        </div>

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
                <MarkdownEditor 
                  value={field.value || ''} 
                  onChange={field.onChange} 
                  placeholder="Tell us a little bit about yourself" 
                />
              </FormControl>
              <FormDescription>
                You can use Markdown for formatting. You can also <span>@mention</span> other users and projects.
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
        
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Steem Blockchain Integration</FormLabel>
              <FormDescription>Link your Steem account to showcase your blog posts and verified identity.</FormDescription>
            </div>
            {currentUser.steemVerified && (
              <Badge variant="outline" className="text-green-500 bg-green-500/10 border-green-500/20 gap-1 px-2 py-1">
                <ShieldCheck className="h-4 w-4" /> Verified
              </Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="steemUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Steem Username
                    {currentUser.steemVerified && <LockIcon className="h-3 w-3 text-muted-foreground" />}
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="Your Steem username" 
                        {...field} 
                        disabled={currentUser.steemVerified}
                      />
                    </FormControl>
                    {currentUser.steemVerified && (
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        className="shrink-0"
                        onClick={async () => {
                          if (confirm('Are you sure you want to reset your Steem verification? This will unlink your current account and remove your verified badge.')) {
                            const result = await resetSteemVerificationAction();
                            if (result.success) {
                              toast({ title: 'Verification Reset', description: 'You can now link a new Steem account.' });
                              window.location.reload();
                            } else {
                              toast({ variant: 'destructive', title: 'Error', description: result.error });
                            }
                          }
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="steemFeedPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feed Preference</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select what to show" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Show All Posts in Global Feed</SelectItem>
                      <SelectItem value="blog">Show Only My Blog Posts</SelectItem>
                      <SelectItem value="none">Don't Show Steem Posts</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!currentUser.steemVerified && (
            <div className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full gap-2"
                disabled={isVerifying || !form.watch('steemUsername')}
                onClick={handleVerifySteem}
              >
                {isVerifying ? 'Verifying...' : 'Verify Identity with Steem Keychain'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> 
                {form.watch('steemUsername') 
                  ? "Verification requires making a one-time proof-of-ownership post to the blockchain."
                  : "Enter a Steem username above to enable verification."
                }
              </p>
            </div>
          )}

          <FormField
              control={form.control}
              name="steemIconOverlay"
              render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-2 bg-background/50">
                      <div className="space-y-0.5">
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider">
                              Display Steem Badge on Avatar
                          </FormLabel>
                          <FormDescription className="text-[10px]">
                              Show a small Steem icon overlay on your profile picture.
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
        </div>

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

