'use client';

import React, { useState } from 'react';
import type { Post, User, HydratedProject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Markdown from '@/components/ui/markdown';
import { toSafeDate } from '@/app/(app)/activity/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/user-avatar';
import { SteemLogo } from '@/components/steem-logo';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePostDialog } from '@/components/projects/create-post-dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ProjectPostsTabProps {
  posts: Post[];
  users: User[];
  currentUser?: User;
  project?: HydratedProject;
  onPostSaved?: (savedPost: Post) => void;
  onPostDeleted?: (postId: string, wasDraft: boolean) => void;
}

export function ProjectPostsTab({
  posts,
  users,
  currentUser,
  project,
  onPostSaved,
  onPostDeleted,
}: ProjectPostsTabProps) {
  const userMap = new Map(users.map(u => [u.id, u]));

  const isAdmin = currentUser?.role === 'admin';
  const isTeamMember = !!(
    currentUser &&
    project &&
    (isAdmin ||
      project.team?.some(member => member.userId === currentUser.id) ||
      project.owner?.id === currentUser.id)
  );

  const isLead =
    isAdmin ||
    !!(
      currentUser &&
      project &&
      (project.team?.some(m => m.userId === currentUser.id && m.role === 'lead') ||
        project.owner?.id === currentUser.id)
    );

  console.log('[CLIENT] ProjectPostsTab:', {
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    isAdmin,
    isTeamMember,
    isLead,
    allPosts: posts.map(p => ({ id: p.id, status: p.status, title: p.title })),
    postsCount: posts.length
  });

  const publishedPosts = posts.filter(post => post.status !== 'draft');

  // Participants only see their own drafts; leads/admins see all
  const draftPosts = posts.filter(post => {
    if (post.status !== 'draft') return false;
    if (isLead) return true;
    return post.userId === currentUser?.id;
  });

  // -----------------------------------------------------------------------
  // Delete row — tracks which post is being deleted to show a spinner
  // -----------------------------------------------------------------------
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteConfirmed = async (postId: string) => {
    setDeletingId(postId);
    const post = posts.find(p => p.id === postId);
    onPostDeleted?.(postId, post?.status === 'draft');
    setDeletingId(null);
  };

  // -----------------------------------------------------------------------
  // Can the current user perform an action on a given post?
  // -----------------------------------------------------------------------
  const canEdit = (post: Post) =>
    !post.deletedAt && currentUser && post.userId === currentUser.id;

  const canDelete = (post: Post) =>
    !post.deletedAt &&
    currentUser &&
    (post.userId === currentUser.id || isLead);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const renderSoftDeletedCard = (post: Post) => (
    <Card
      key={post.id}
      className="overflow-hidden border-dashed border-muted-foreground/30 bg-muted/20"
    >
      <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground italic">
        <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <span>
          This post was deleted by the {post.deletedBy ?? 'author'}.
        </span>
      </CardContent>
    </Card>
  );

  const renderPostList = (postsToRender: Post[], isDraftList = false) => {
    if (postsToRender.length === 0) {
      return (
        <div className="py-8">
          <EmptyState
            message={isDraftList ? 'No drafts saved.' : 'No posts yet for this project.'}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6 py-4">
        {postsToRender.map(post => {
          if (post.deletedAt) return renderSoftDeletedCard(post);

          const author = userMap.get(post.userId);
          const date = toSafeDate(post.createdAt);

          return (
            <Card
              key={post.id}
              className={cn(
                'overflow-hidden transition-all',
                isDraftList
                  ? 'border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/30 dark:hover:bg-amber-950/20'
                  : 'hover:bg-muted/50',
              )}
            >
              <CardHeader className="flex flex-row items-start gap-4 pb-2">
                {author && <UserAvatar user={author} className="h-10 w-10 mt-1" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    {isDraftList && (
                      <Badge
                        variant="outline"
                        className="border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/20 text-[10px] font-bold uppercase tracking-wider py-0.5 px-1.5"
                      >
                        Draft
                      </Badge>
                    )}
                    {post.editedAt && !isDraftList && (
                      <span className="text-[10px] text-muted-foreground italic">edited</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{author?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {isDraftList && isTeamMember && currentUser && project && canEdit(post) ? (
                    <div className="flex items-center gap-2">
                      <CreatePostDialog
                        project={project}
                        currentUser={currentUser}
                        post={post}
                        onPostSaved={onPostSaved}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit &amp; Publish
                          </Button>
                        }
                      />
                      {canDelete(post) && (
                        <DeletePostButton
                          postId={post.id}
                          isDraft
                          isLoading={deletingId === post.id}
                          onConfirm={handleDeleteConfirmed}
                        />
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {/* Published-post actions */}
                        {!isDraftList && canEdit(post) && currentUser && project && (
                          <CreatePostDialog
                            project={project}
                            currentUser={currentUser}
                            post={post}
                            onPostSaved={onPostSaved}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit post</span>
                              </Button>
                            }
                          />
                        )}
                        {!isDraftList && canDelete(post) && (
                          <DeletePostButton
                            postId={post.id}
                            isDraft={false}
                            isLoading={deletingId === post.id}
                            onConfirm={handleDeleteConfirmed}
                          />
                        )}
                        {/* Steem badges */}
                        {post.steemStatus === 'confirmed' && (
                          <Badge
                            variant="outline"
                            className="gap-1.5 py-1 px-2 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            <SteemLogo className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Broadcasted
                            </span>
                            <a
                              href={`https://steemit.com/@${post.steemAuthor}/${post.steemPermlink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 hover:text-blue-800"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Badge>
                        )}
                        {post.steemStatus === 'pending' && (
                          <Badge variant="outline" className="gap-1.5 py-1 px-2 animate-pulse">
                            <SteemLogo className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Pending Steem
                            </span>
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <Markdown content={post.content} />
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (!isTeamMember) {
    // Non-members only see published, non-deleted posts
    return renderPostList(publishedPosts.filter(p => !p.deletedAt));
  }

  return (
    <div className="py-4">
      <Tabs defaultValue="published" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="published" className="relative">
            Published Updates ({publishedPosts.filter(p => !p.deletedAt).length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="relative gap-1.5">
            Drafts ({draftPosts.length})
            {draftPosts.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published" className="mt-0">
          {renderPostList(publishedPosts, false)}
        </TabsContent>
        <TabsContent value="drafts" className="mt-0">
          {renderPostList(draftPosts, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeletePostButton — isolated so it manages its own AlertDialog state
// ---------------------------------------------------------------------------
function DeletePostButton({
  postId,
  isDraft,
  isLoading,
  onConfirm,
}: {
  postId: string;
  isDraft: boolean;
  isLoading: boolean;
  onConfirm: (id: string) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete post</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDraft ? 'Delete draft?' : 'Delete post?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDraft
              ? 'This draft will be permanently deleted and cannot be recovered.'
              : 'The post will be marked as deleted. Replies and references will be preserved.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onConfirm(postId)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
