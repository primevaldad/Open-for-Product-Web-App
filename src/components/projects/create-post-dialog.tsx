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
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SteemKeychain } from '@/lib/steem-keychain.client';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Share2, Rocket } from 'lucide-react';
import type { HydratedProject, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { createPostAction, confirmSteemBroadcastAction } from '@/app/actions/post';
import { SteemLogo } from '@/components/steem-logo';

interface CreatePostDialogProps {
  project: HydratedProject;
  currentUser: User;
  trigger?: React.ReactNode;
}

export function CreatePostDialog({ project, currentUser, trigger }: CreatePostDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState(`Update: ${project.name}`);
  const [body, setBody] = useState(`I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n${project.tagline}`);
  const [tags, setTags] = useState('openforproduct development');
  const [broadcastToSteem, setBroadcastToSteem] = useState(!!currentUser.steemVerified);

  const handlePost = async () => {
    setIsPosting(true);
    try {
      const cleanTags = tags
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 0);

      const permlink = broadcastToSteem
        ? `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-update-${Date.now().toString(36)}`
        : undefined;

      // 1. Save to OfP Firestore
      const result = await createPostAction({
        projectId: project.id,
        title,
        content: body,
        tags: cleanTags,
        broadcastToSteem,
        steemPermlink: permlink
      });

      if (result.error) throw new Error(result.error);

      // 2. Optional Steem Broadcast
      if (broadcastToSteem && permlink) {
        if (!currentUser.steemUsername) {
          throw new Error('Steem username not linked');
        }

        const jsonMetadata = JSON.stringify({
          tags: ['hive-111745', ...cleanTags],
          app: 'openforproduct/1.0',
          project_id: project.id,
          format: 'markdown'
        });

        if (currentUser.steemTestnetEnabled) {
          toast({ title: 'Simulation', description: 'Simulating Steem broadcast...' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          await confirmSteemBroadcastAction(result.postId!, permlink);
        } else {
          const steemResult = await SteemKeychain.requestPost(
            currentUser.steemUsername,
            title,
            body,
            'hive-111745', // Community tag
            '',
            jsonMetadata,
            permlink
          );

          if (steemResult.success) {
            await confirmSteemBroadcastAction(result.postId!, permlink);
            toast({ title: 'Published to Steem!' });
          } else {
            toast({
              variant: 'destructive',
              title: 'Steem Broadcast Failed',
              description: 'Post saved to OfP, but Steem broadcast failed.'
            });
          }
        }
      }

      toast({
        title: 'Post Created',
        description: 'Your project update has been shared.',
      });
      setOpen(false);
      setTitle(`Update: ${project.name}`);
      setBody(`I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n${project.tagline}`);
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
        {trigger || (
          <Button variant="outline" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Project Update</DialogTitle>
          <DialogDescription>
            Share progress, news, or questions about <strong>{project.name}</strong>.
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
              sideBySide={true}
              steemFlavor={broadcastToSteem}
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
          </div>

          {currentUser.steemVerified && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="steem-broadcast"
                checked={broadcastToSteem}
                onCheckedChange={(checked) => setBroadcastToSteem(!!checked)}
              />
              <Label htmlFor="steem-broadcast" className="flex items-center gap-2 cursor-pointer">
                <SteemLogo className="h-4 w-4 text-[#3c4fe0]" />
                Broadcast to Steem Blockchain
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePost}
            disabled={isPosting || !title || !body}
            className="gap-2"
          >
            {isPosting ? 'Posting...' : 'Create Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
