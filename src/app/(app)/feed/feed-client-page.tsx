'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Post, Discussion, User, Project, HydratedNotification } from '@/lib/types';
import { EventType } from '@/lib/types';
import { ProjectPostsTab } from '@/components/projects/project-posts-tab';
import { FeedDiscussionItem } from '@/components/projects/feed-discussion-item';
import { NotificationCard } from '@/components/NotificationCard';
import { markCommunityFeedAsSeenAction } from '@/app/actions/user';
import { EmptyState } from '@/components/ui/empty-state';

interface FeedClientPageProps {
  memberPosts: Post[];
  globalPosts: Post[];
  memberDiscussions: Discussion[];
  globalDiscussions: Discussion[];
  notifications: HydratedNotification[];
  users: User[];
  projects: Project[];
  currentUser: User;
}

// Helper hook for infinite scroll
function useInfiniteScroll<T>(items: T[], initialCount: number, increment: number) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          setVisibleCount(prev => Math.min(prev + increment, items.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [visibleCount, items.length, increment]);

  return { visibleItems: items.slice(0, visibleCount), observerTarget, hasMore: visibleCount < items.length };
}

export function FeedClientPage({
  memberPosts,
  globalPosts,
  memberDiscussions,
  globalDiscussions,
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

  // Categorize notifications
  const discussionNotifications = notifications.filter(n => 
    [EventType.DISCUSSION_COMMENT_POSTED, EventType.DISCUSSION_COMMENT_REPLIED].includes(n.event.type)
  );

  const myActivityNotifications = notifications.filter(n => 
    ![EventType.DISCUSSION_COMMENT_POSTED, EventType.DISCUSSION_COMMENT_REPLIED].includes(n.event.type)
  );

  // Infinite Scroll Hooks
  const { visibleItems: visibleAllNotifs, observerTarget: allNotifsTarget } = useInfiniteScroll(notifications, 20, 20);
  const { visibleItems: visibleActivity, observerTarget: activityTarget, hasMore: hasMoreActivity } = useInfiniteScroll(myActivityNotifications, 20, 20);
  const { visibleItems: visibleDiscNotifs, observerTarget: discNotifsTarget, hasMore: hasMoreDiscNotifs } = useInfiniteScroll(discussionNotifications, 20, 20);
  const { visibleItems: visibleMemberPosts, observerTarget: memberPostsTarget, hasMore: hasMoreMemberPosts } = useInfiniteScroll(memberPosts, 5, 5);
  const { visibleItems: visibleGlobalPosts, observerTarget: globalPostsTarget, hasMore: hasMoreGlobalPosts } = useInfiniteScroll(globalPosts, 5, 5);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
      </div>

      <Tabs value={activeMainTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="my">My Feed</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 mb-6 w-full justify-start gap-6 overflow-x-auto flex-nowrap">
              <TabsTrigger 
                value="all" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap"
              >
                Project Posts
              </TabsTrigger>
              <TabsTrigger 
                value="discussions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap"
              >
                Discussions
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 whitespace-nowrap"
              >
                My Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-0 rounded-lg border bg-card overflow-hidden">
                {notifications.length === 0 ? (
                  <EmptyState message="You have no notifications yet." />
                ) : (
                  <>
                    {visibleAllNotifs.map(n => <NotificationCard key={n.id} notification={n} />)}
                    <div ref={allNotifsTarget} className="h-4" />
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="posts">
              <div className="space-y-4">
                <ProjectPostsTab posts={visibleMemberPosts} users={users} />
                {hasMoreMemberPosts && <div ref={memberPostsTarget} className="h-4" />}
              </div>
            </TabsContent>
            
            <TabsContent value="discussions">
              <div className="space-y-0 rounded-lg border bg-card overflow-hidden">
                {discussionNotifications.length === 0 ? (
                  <EmptyState message="No recent discussions." />
                ) : (
                  <>
                    {visibleDiscNotifs.map(n => <NotificationCard key={n.id} notification={n} />)}
                    {hasMoreDiscNotifs && <div ref={discNotifsTarget} className="h-4" />}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="activity">
              <div className="space-y-0 rounded-lg border bg-card overflow-hidden">
                {myActivityNotifications.length === 0 ? (
                  <EmptyState message="No recent activity found." />
                ) : (
                  <>
                    {visibleActivity.map(n => <NotificationCard key={n.id} notification={n} />)}
                    {hasMoreActivity && <div ref={activityTarget} className="h-4" />}
                  </>
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
              <div className="space-y-4">
                <ProjectPostsTab posts={visibleGlobalPosts} users={users} />
                {hasMoreGlobalPosts && <div ref={globalPostsTarget} className="h-4" />}
              </div>
            </TabsContent>
            
            <TabsContent value="discussions">
              <div className="space-y-4">
                {globalDiscussions.length === 0 ? (
                  <EmptyState message="No recent discussions in the community." />
                ) : (
                  globalDiscussions.map(d => {
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
