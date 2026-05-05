'use client';

import React from 'react';
import type { Discussion, User, Project } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Markdown from '@/components/ui/markdown';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/user-avatar';
import { toSafeDate } from '@/app/(app)/feed/utils';
import Link from 'next/link';

interface FeedDiscussionItemProps {
  discussion: Discussion;
  author: User;
  project?: Project;
}

export function FeedDiscussionItem({ discussion, author, project }: FeedDiscussionItemProps) {
  const date = toSafeDate(discussion.createdAt);

  return (
    <Card className="hover:bg-accent/5 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <UserAvatar user={author} className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(date, { addSuffix: true })}
                </span>
              </div>
              {project && (
                <Link 
                  href={`/projects/${project.id}?tab=2`} // Tab 2 is Discussion
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  in {project.name}
                </Link>
              )}
            </div>
            <div className="text-sm line-clamp-3">
              <Markdown content={discussion.content} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
