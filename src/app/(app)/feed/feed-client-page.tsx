'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Post, Discussion, User, Project } from '@/lib/types';
import { ProjectPostsTab } from '@/components/projects/project-posts-tab';
import { FeedDiscussionItem } from '@/components/projects/feed-discussion-item';
import { HydratedActivityItem, renderActivityMessage, toSafeDate } from './utils';
import { UserAvatar } from '@/components/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import { markCommunityFeedAsSeenAction } from '@/app/actions/user';
import { EmptyState } from '@/components/ui/empty-state';

interface FeedClientPageProps {
  memberPosts: Post[];
  followedPosts: Post[];
  memberDiscussions: Discussion[];
  followedDiscussions: Discussion[];
  notifications: HydratedActivityItem[];
  users: User[];
  projects: Project[];
  currentUser: User;
}

export function FeedClientPage({
  memberPosts,
  followedPosts,
  memberDiscussions,
  followedDiscussions,
  notifications,
  users,
  projects,
  currentUser
}: FeedClientPageProps) {
  const [activeMainTab, setActiveMainTab] = useState('my');

  const handleTabChange = (value: string) => {
    setActiveMainTab(value);
    if (value === 'community') {
      markCommunityFeedAsSeenAction(currentUser.id);
    }
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const userMap = new Map(users.map(u => [u.id, u]));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
      </div>

      <Tabs value={activeMainTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="my">My Feed</TabsTrigger>
          <TabsTrigger value="community">Community Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-6">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 mb-6 w-full justify-start gap-6">
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2"
              >
                Project Posts
              </TabsTrigger>
              <TabsTrigger 
                value="discussions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2"
              >
                Discussions
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2"
              >
                My Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <ProjectPostsTab posts={memberPosts} users={users} />
            </TabsContent>
            
            <TabsContent value="discussions">
              <div className="space-y-4">
                {memberDiscussions.length === 0 ? (
                  <EmptyState message="No recent discussions in your projects." />
                ) : (
                  memberDiscussions.map(d => {
                    const author = userMap.get(d.userId);
                    const project = projectMap.get(d.projectId);
                    if (!author) return null;
                    return <FeedDiscussionItem key={d.id} discussion={d} author={author} project={project} />;
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="activity">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <EmptyState message="No recent activity found." />
                ) : (
                  notifications.map(item => (
                    <div key={item.id} className="p-4 border rounded-lg shadow-sm bg-card flex items-start gap-4 hover:bg-muted/50 transition-all cursor-default">
                      <UserAvatar user={item.actor} className="h-10 w-10 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-semibold">{item.actor.name}</span>
                          {' '}
                          {renderActivityMessage(item)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(toSafeDate(item.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 mb-6 w-full justify-start gap-6">
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2"
              >
                Recent Posts
              </TabsTrigger>
              <TabsTrigger 
                value="discussions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2"
              >
                Active Discussions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts">
              <ProjectPostsTab posts={followedPosts} users={users} />
            </TabsContent>
            
            <TabsContent value="discussions">
              <div className="space-y-4">
                {followedDiscussions.length === 0 ? (
                  <EmptyState message="No recent discussions in projects you follow." />
                ) : (
                  followedDiscussions.map(d => {
                    const author = userMap.get(d.userId);
                    const project = projectMap.get(d.projectId);
                    if (!author) return null;
                    return <FeedDiscussionItem key={d.id} discussion={d} author={author} project={project} />;
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
