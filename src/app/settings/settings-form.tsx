
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useTransition } from "react";
import { updateUserSettings } from "../actions/settings";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SettingsFormProps {
    currentUser: User;
}

export default function SettingsForm({ currentUser }: SettingsFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatarUrl);

  const handleSaveChanges = () => {
    if (!currentUser) return;
    startTransition(async () => {
      const result = await updateUserSettings({
        id: currentUser.id,
        name,
        bio,
        avatarDataUrl: avatarPreview
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
            setAvatarPreview(reader.result as string);
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
                <AvatarImage src={avatarPreview || ''} alt={name} />
                <AvatarFallback className="text-2xl">{name?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={triggerFileSelect}>Change Photo</Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange}
                className="hidden"
                accept="image/*"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio ?? ''} onChange={(e) => setBio(e.target.value)} />
            </div>
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
              <Input id="email" type="email" defaultValue="alex.doe@example.com" disabled />
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
            <Button variant="outline">Discard</Button>
            <Button onClick={handleSaveChanges} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </div>
  )
}
