
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useRef, useTransition } from "react";
import { updateUserSettings } from "../actions/settings";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getInitials } from '@/lib/utils';


const SettingsSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  bio: z.string().optional(),
  avatarDataUrl: z.string().optional().nullable(),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

interface SettingsFormProps {
    currentUser: User;
}

export default function SettingsForm({ currentUser }: SettingsFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
        name: currentUser.name || "",
        bio: currentUser.bio || "",
        avatarDataUrl: currentUser.avatarUrl,
    }
  });

  const avatarPreview = form.watch('avatarDataUrl');


  const handleSaveChanges = (values: SettingsFormValues) => {
    if (!currentUser) return;
    startTransition(async () => {
      const result = await updateUserSettings({
        id: currentUser.id,
        ...values,
      });

      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Your changes have been successfully saved.",
        });
      } else {
         toast({
          variant: "destructive",
          title: "Error Saving Settings",
          description: result.error,
        });
      }
    });
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            form.setValue('avatarDataUrl', reader.result as string);
        }
        reader.readAsDataURL(file);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select a valid image file.",
        });
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  }
  
  return (
      <div className="mx-auto max-w-3xl space-y-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
                <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                    This is how others will see you on the site.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={avatarPreview || ''} alt={form.watch('name')} />
                            <AvatarFallback className="text-2xl">{getInitials(form.watch('name'))}</AvatarFallback>
                        </Avatar>
                        <Button type="button" variant="outline" onClick={triggerFileSelect}>Change Photo</Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handlePhotoChange}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
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
                                    <Textarea {...field} />
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
                    Update your account settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={currentUser.id.includes('u1') ? 'alex.doe@example.com' : 'user@example.com'} disabled />
                    </div>
                    <Button variant="outline" disabled>Change Password</Button>
                </CardContent>
                </Card>
                
                <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                    Manage how you receive notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="font-medium">Email Notifications</h3>
                        <p className="text-sm text-muted-foreground">Receive updates about projects and mentions.</p>
                    </div>
                    <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="font-medium">In-app Notifications</h3>
                        <p className="text-sm text-muted-foreground">Show notifications directly in the app.</p>
                    </div>
                    <Switch defaultChecked />
                    </div>
                </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>Discard</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Form>
      </div>
  )
}
