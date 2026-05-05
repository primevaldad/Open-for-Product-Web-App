'use client';

import React, { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import type { Post, Discussion, User, Project } from '@/lib/types';
import { ProjectPostsTab } from '@/components/projects/project-posts-tab';
import { FeedDiscussionItem } from '@/components/projects/feed-discussion-item';
import { HydratedActivityItem, renderActivityMessage, toSafeDate } from './utils';
import { UserAvatar } from '@/components/user-avatar';
import { formatDistanceToNow } from 'date-fns';
import { markCommunityFeedAsSeenAction } from '@/app/actions/user';

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
  const [mainTab, setMainTab] = useState(0);

  React.useEffect(() => {
    if (mainTab === 1) {
      markCommunityFeedAsSeenAction(currentUser.id);
    }
  }, [mainTab, currentUser.id]);

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const userMap = new Map(users.map(u => [u.id, u]));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Feed</h1>

      <Tabs selectedIndex={mainTab} onSelect={setMainTab}>
        <TabList className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <Tab className="pb-2 px-4 cursor-pointer hover:text-blue-600 transition-colors ui-selected:border-b-2 ui-selected:border-blue-600 ui-selected:text-blue-600 outline-none">
            My Feed
          </Tab>
          <Tab className="pb-2 px-4 cursor-pointer hover:text-blue-600 transition-colors ui-selected:border-b-2 ui-selected:border-blue-600 ui-selected:text-blue-600 outline-none">
            Community Feed
          </Tab>
        </TabList>

        <TabPanel>
          <Tabs>
            <TabList className="mb-4 text-sm">
              <Tab>Project Posts</Tab>
              <Tab>Discussions</Tab>
              <Tab>My Activity</Tab>
            </TabList>

            <TabPanel>
              <ProjectPostsTab posts={memberPosts} users={users} />
            </TabPanel>
            <TabPanel>
              <div className="space-y-4">
                {memberDiscussions.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No recent discussions in your projects.</p>
                ) : (
                  memberDiscussions.map(d => {
                    const author = userMap.get(d.userId);
                    const project = projectMap.get(d.projectId);
                    if (!author) return null;
                    return <FeedDiscussionItem key={d.id} discussion={d} author={author} project={project} />;
                  })
                )}
              </div>
            </TabPanel>
            <TabPanel>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No recent activity.</p>
                ) : (
                  notifications.map(item => (
                    <div key={item.id} className="p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 flex items-start gap-4">
                      <UserAvatar user={item.actor} className="h-10 w-10 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{item.actor.name}</span>
                          {' '}
                          {renderActivityMessage(item)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(toSafeDate(item.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabPanel>
          </Tabs>
        </TabPanel>

        <TabPanel>
          <Tabs>
            <TabList className="mb-4 text-sm">
              <Tab>Posts</Tab>
              <Tab>Discussions</Tab>
            </TabList>

            <TabPanel>
              <ProjectPostsTab posts={followedPosts} users={users} />
            </TabPanel>
            <TabPanel>
              <div className="space-y-4">
                {followedDiscussions.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No recent discussions in projects you follow.</p>
                ) : (
                  followedDiscussions.map(d => {
                    const author = userMap.get(d.userId);
                    const project = projectMap.get(d.projectId);
                    if (!author) return null;
                    return <FeedDiscussionItem key={d.id} discussion={d} author={author} project={project} />;
                  })
                )}
              </div>
            </TabPanel>
          </Tabs>
        </TabPanel>
      </Tabs>
    </div>
  );
}
