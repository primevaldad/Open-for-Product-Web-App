'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SteemKeychain } from '@/lib/steem-keychain.client';
import { useToast } from '@/hooks/use-toast';
import { Rocket, Share2 } from 'lucide-react';
import type { HydratedProject, User } from '@/lib/types';
import { cn } from '@/lib/utils';

const SteemLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("h-4 w-4", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M16.142 2l-2.072 2.646c1.32.42 2.454 1.253 3.242 2.373l2.046-2.613c-1.026-1.15-2.062-2.146-3.216-2.406zm-6.68 1.455l-2.071 2.646c.866.425 1.62.993 2.222 1.666l2.046-2.613c-.643-.593-1.4-.95-2.197-1.699zm10.538 4.545l-2.071 2.646c.15.534.227 1.1.227 1.682l2.046-2.613c.134-.787.05-1.464-.202-1.715zm-16.002 1l-2.07 2.646c-.15.534-.227 1.1-.227 1.682l2.045-2.613c-.133-.787-.049-1.464.202-1.715zm12.756 1.455l-2.071 2.646c.42 1.32 1.253 2.454 2.373 3.242l2.613-2.046c-1.15-1.026-2.146-2.062-2.915-3.842zm-6.68 1.455l-2.071 2.646c.425.866.993 1.62 1.666 2.222l2.613-2.046c-.593-.643-.95-1.4-1.699-2.197zm1.455 6.68l-2.646 2.071c.425.866.993 1.62 1.666 2.222l2.613-2.046c-.593-.643-.95-1.4-1.633-2.247zm-5.455-2.545l-2.646 2.071c1.32.42 2.454 1.253 3.242 2.373l2.613-2.046c-1.15-1.026-2.146-2.062-3.209-2.398z" />
  </svg>
);

interface PostToSteemDialogProps {
  project: HydratedProject;
  currentUser: User;
}

export function PostToSteemDialog({ project, currentUser }: PostToSteemDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState(`Project Update: ${project.name}`);
  const [body, setBody] = useState(`I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n\n\n\n\n${project.tagline}`);
  const [tags, setTags] = useState('openforproduct development');

  const handlePost = async () => {
    if (!currentUser.steemUsername) {
      toast({
        variant: 'destructive',
        title: 'Steem Account Not Linked',
        description: 'Please link your Steem username in settings first.',
      });
      return;
    }

    if (!currentUser.steemVerified && !currentUser.steemTestnetEnabled) {
      toast({
        variant: 'destructive',
        title: 'Account Not Verified',
        description: 'Please verify your Steem account in settings.',
      });
      return;
    }

    setIsPosting(true);
    try {
      const cleanTags = tags
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 0);

      const permlink = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-update-${Date.now().toString(36)}`;

      const jsonMetadata = JSON.stringify({
        tags: ['hive-111745', ...cleanTags],
        app: 'openforproduct/1.0',
        project_id: project.id,
        format: 'markdown'
      });

      if (currentUser.steemTestnetEnabled) {
        toast({ title: 'Simulation Mode', description: 'Simulating Steem broadcast...' });
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        const result = await SteemKeychain.requestPost(
          currentUser.steemUsername,
          title,
          body,
          'hive-111745', // Community tag
          '',
          jsonMetadata,
          permlink
        );

        if (!result.success) {
          throw new Error(result.message);
        }
      }

      toast({
        title: 'Published to Steem!',
        description: 'Your update has been successfully broadcasted to the blockchain.',
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Posting Failed',
        description: error.message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SteemLogo className="text-[#3c4fe0]" />
          Post to Steem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SteemLogo className="h-5 w-5 text-[#3c4fe0]" />
            Share Project Update on Steem
          </DialogTitle>
          <DialogDescription>
            Your post will be published to the <strong>Open for Product</strong> community (hive-111745).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="title">Post Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title"
            />
          </div>

          <div className="space-y-2">
            <Label>Content (Markdown)</Label>
            <MarkdownEditor
              value={body}
              onChange={setBody}
              steemFlavor={true}
              className="min-h-[300px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (space separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value.toLowerCase().replace(/[^a-z\s]/g, ''))}
              placeholder="e.g. development product community"
            />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Lowercase letters only. The community tag <strong>#openforproduct</strong> will be added automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePost}
            disabled={isPosting || !title || !body}
            className="gap-2"
          >
            {isPosting ? 'Broadcasting...' : 'Publish to Steem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
