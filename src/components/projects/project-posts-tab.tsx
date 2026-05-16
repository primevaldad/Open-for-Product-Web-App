'use client';

import React from 'react';
import type { Post, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Markdown from '@/components/ui/markdown';
import { toSafeDate } from '@/app/(app)/activity/utils';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/user-avatar';
import { SteemLogo } from '@/components/steem-logo';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface ProjectPostsTabProps {
  posts: Post[];
  users: User[];
}

export function ProjectPostsTab({ posts, users }: ProjectPostsTabProps) {
  const userMap = new Map(users.map(u => [u.id, u]));

  if (posts.length === 0) {
    return <EmptyState message="No posts yet for this project." />;
  }

  return (
    <div className="space-y-6 py-4">
      {posts.map(post => {
        const author = userMap.get(post.userId);
        const date = toSafeDate(post.createdAt);

        return (
          <Card key={post.id} className="overflow-hidden hover:bg-muted/50 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              {author && <UserAvatar user={author} className="h-10 w-10" />}
              <div className="flex-1">
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{author?.name || 'Unknown'}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
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
}
