'use client';

import React, { useState, useEffect } from 'react';
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
import { PlusCircle, Edit } from 'lucide-react';
import type { HydratedProject, User, Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { createPostAction, updatePostAction, confirmSteemBroadcastAction } from '@/app/actions/post';
import { SteemLogo } from '@/components/steem-logo';

interface CreatePostDialogProps {
  project: HydratedProject;
  currentUser: User;
  post?: Post;
  trigger?: React.ReactNode;
}

export function CreatePostDialog({ project, currentUser, post, trigger }: CreatePostDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState(post?.title ?? `Update: ${project.name}`);
  const [body, setBody] = useState(post?.content ?? `I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n${project.tagline}`);
  const [tags, setTags] = useState(post?.tags ? post.tags.join(' ') : 'openforproduct development');
  const [broadcastToSteem, setBroadcastToSteem] = useState(post ? post.steemStatus !== 'none' : !!currentUser.steemVerified);

  useEffect(() => {
    if (open) {
      setTitle(post?.title ?? `Update: ${project.name}`);
      setBody(post?.content ?? `I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n${project.tagline}`);
      setTags(post?.tags ? post.tags.join(' ') : 'openforproduct development');
      setBroadcastToSteem(post ? post.steemStatus !== 'none' : !!currentUser.steemVerified);
    }
  }, [open, post, project, currentUser]);

  const handlePost = async (status: 'draft' | 'published') => {
    setIsPosting(true);
    try {
      const cleanTags = tags
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 0);

      const shouldBroadcast = status === 'published' && broadcastToSteem;
      const permlink = shouldBroadcast
        ? `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-update-${Date.now().toString(36)}`
        : undefined;

      let result;
      if (post) {
        result = await updatePostAction(post.id, {
          title,
          content: body,
          tags: cleanTags,
          status,
          broadcastToSteem: shouldBroadcast,
          steemPermlink: permlink
        });
      } else {
        result = await createPostAction({
          projectId: project.id,
          title,
          content: body,
          tags: cleanTags,
          status,
          broadcastToSteem: shouldBroadcast,
          steemPermlink: permlink
        });
      }

      if (result.error) throw new Error(result.error);

      if (shouldBroadcast && permlink) {
        if (!currentUser.steemUsername) {
          throw new Error('Steem username not linked');
        }

        const jsonMetadata = JSON.stringify({
          tags: ['hive-111745', ...cleanTags],
          app: 'openforproduct/1.0',
          project_id: project.id,
          format: 'markdown'
        });

        const activePostId = post ? post.id : result.postId!;

        if (currentUser.steemTestnetEnabled) {
          toast({ title: 'Simulation', description: 'Simulating Steem broadcast...' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          await confirmSteemBroadcastAction(activePostId, permlink);
        } else {
          const steemResult = await SteemKeychain.requestPost(
            currentUser.steemUsername,
            title,
            body,
            'hive-111745',
            '',
            jsonMetadata,
            permlink
          );

          if (steemResult.success) {
            await confirmSteemBroadcastAction(activePostId, permlink);
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
        title: status === 'draft' ? 'Draft Saved' : (post ? 'Post Updated' : 'Post Created'),
        description: status === 'draft'
          ? 'Your draft has been saved successfully.'
          : 'Your project update has been shared.',
      });
      
      setOpen(false);
      
      if (!post) {
        setTitle(`Update: ${project.name}`);
        setBody(`I'm excited to share an update about **${project.name}** on Open for Product!\n\n${project.name}\n\n\n\n\n\n${project.tagline}`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error.message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const isDraftState = !post || post.status === 'draft';

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
          <DialogTitle>{post ? (post.status === 'draft' ? 'Edit Draft' : 'Edit Post') : 'Create Project Update'}</DialogTitle>
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

          {currentUser.steemVerified && isDraftState && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="steem-broadcast"
                checked={broadcastToSteem}
                onCheckedChange={(checked) => setBroadcastToSteem(!!checked)}
              />
              <Label htmlFor="steem-broadcast" className="flex items-center gap-2 cursor-pointer">
                <SteemLogo className="h-4 w-4 text-[#3c4fe0]" />
                Broadcast to Steem Blockchain on Publish
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          {isDraftState ? (
            <>
              <Button
                variant="outline"
                onClick={() => handlePost('draft')}
                disabled={isPosting || !title || !body}
              >
                {isPosting ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={() => handlePost('published')}
                disabled={isPosting || !title || !body}
                className="gap-2"
              >
                {isPosting ? 'Publishing...' : 'Publish Update'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => handlePost('published')}
              disabled={isPosting || !title || !body}
            >
              {isPosting ? 'Updating...' : 'Update Post'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
