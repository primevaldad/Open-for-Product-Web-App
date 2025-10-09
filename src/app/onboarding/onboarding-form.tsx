
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, Interest } from '@/lib/types';
import { interests } from '@/lib/static-data';
import type { updateOnboardingInfo } from '../actions/settings';


const onboardingSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  bio: z.string().optional(),
  interests: z.array(z.string()).min(1, { message: 'Please select at least one interest.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
    newUser: User;
    updateOnboardingInfo: (values: OnboardingFormValues & { id: string }) => Promise<{ success: boolean; error?: string }>;
}

export default function OnboardingForm({ newUser, updateOnboardingInfo }: OnboardingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: newUser.name || '',
      bio: newUser.bio || '',
      interests: [],
    },
  });

  function onSubmit(data: OnboardingFormValues) {
    startTransition(async () => {
        const result = await updateOnboardingInfo({ ...data, id: newUser!.id });

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
                      <Textarea
                        placeholder="Tell us a little about yourself, your skills, and what you're passionate about."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      This will be displayed on your public profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Interests</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                'w-full justify-between',
                                !field.value?.length && 'text-muted-foreground'
                                )}
                            >
                                <div className="flex gap-1 flex-wrap">
                                {field.value?.length > 0 ? (
                                    field.value.map((interest) => (
                                    <Badge
                                        variant="secondary"
                                        key={interest}
                                        className="mr-1"
                                    >
                                        {interests.find(i => i.name === interest)?.name || interest}
                                    </Badge>
                                    ))
                                ) : (
                                    "Select your interests"
                                )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search interests..." />
                                <CommandEmpty>No interest found.</CommandEmpty>
                                <CommandList>
                                <CommandGroup>
                                    {interests.map((interest) => (
                                    <CommandItem
                                        value={interest.name}
                                        key={interest.id}
                                        onSelect={() => {
                                            const currentInterests = field.value || [];
                                            const updatedInterests = currentInterests.includes(interest.name)
                                            ? currentInterests.filter(i => i !== interest.name)
                                            : [...currentInterests, interest.name];
                                            form.setValue('interests', updatedInterests);
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value?.includes(interest.name)
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                        )}
                                        />
                                        {interest.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                        </Popover>
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
