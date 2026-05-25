'use client';

import React from 'react';
import type { Post, User, HydratedProject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Markdown from '@/components/ui/markdown';
import { toSafeDate } from '@/app/(app)/activity/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/user-avatar';
import { SteemLogo } from '@/components/steem-logo';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Edit } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePostDialog } from '@/components/projects/create-post-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectPostsTabProps {
  posts: Post[];
  users: User[];
  currentUser?: User;
  project?: HydratedProject;
  onPostSaved?: (savedPost: Post) => void;
}

export function ProjectPostsTab({ posts, users, currentUser, project, onPostSaved }: ProjectPostsTabProps) {
  const userMap = new Map(users.map(u => [u.id, u]));

  const isTeamMember = !!(
    currentUser &&
    project &&
    (project.team?.some(member => member.userId === currentUser.id) ||
      project.owner?.id === currentUser.id)
  );

  const publishedPosts = posts.filter(post => post.status !== 'draft');
  const draftPosts = posts.filter(post => post.status === 'draft');

  const renderPostList = (postsToRender: Post[], isDraftList = false) => {
    if (postsToRender.length === 0) {
      return (
        <div className="py-8">
          <EmptyState message={isDraftList ? "No drafts saved." : "No posts yet for this project."} />
        </div>
      );
    }

    return (
      <div className="space-y-6 py-4">
        {postsToRender.map(post => {
          const author = userMap.get(post.userId);
          const date = toSafeDate(post.createdAt);

          return (
            <Card 
              key={post.id} 
              className={cn(
                "overflow-hidden transition-all",
                isDraftList 
                  ? "border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/30 dark:hover:bg-amber-950/20" 
                  : "hover:bg-muted/50"
              )}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                {author && <UserAvatar user={author} className="h-10 w-10" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    {isDraftList && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/20 text-[10px] font-bold uppercase tracking-wider py-0.5 px-1.5">
                        Draft
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{author?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isDraftList && isTeamMember && currentUser && project ? (
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
                  ) : (
                    <>
                      {post.steemStatus === 'confirmed' && (
                        <Badge variant="outline" className="gap-1.5 py-1 px-2 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <SteemLogo className="h-3 w-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Broadcasted</span>
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pending Steem</span>
                        </Badge>
                      )}
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
    return renderPostList(publishedPosts);
  }

  return (
    <div className="py-4">
      <Tabs defaultValue="published" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="published" className="relative">
            Published Updates ({publishedPosts.length})
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
