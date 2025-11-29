'use client';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import ActivityList from './activity-list';
import type { HydratedActivityItem } from './utils';
import { User } from '@/lib/types';
import { HydratedProject } from '@/lib/types';

export interface ActivityClientPageProps {
  activity: HydratedActivityItem[];
  currentUser: User;
  projects: HydratedProject[];
  users: User[];
}

export default function ActivityClientPage({ activity, currentUser, projects, users }: ActivityClientPageProps) {
  // Defensive check to prevent runtime errors if currentUser is not available.
  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center"><p>Loading user data...</p></div>;
  }

  const myActivity = activity.filter(a => a.actor.id === currentUser.id);
  // Filter for the user's projects, ensuring the team property is an array before checking its contents.
  const myProjects = projects.filter(p => p.owner?.id === currentUser.id || (Array.isArray(p.team) && p.team.some(tm => tm.userId === currentUser.id)));
  const myProjectIds = myProjects.map(p => p.id);
  const myProjectsActivity = activity.filter(a => a.project && myProjectIds.includes(a.project.id));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Activity Feed</h1>
      <Tabs>
        <TabList>
          <Tab>All Activity</Tab>
          <Tab>My Projects</Tab>
          <Tab>My Activity</Tab>
        </TabList>

        <TabPanel>
          <ActivityList items={activity} />
        </TabPanel>
        <TabPanel>
          <ActivityList items={myProjectsActivity} />
        </TabPanel>
        <TabPanel>
          <ActivityList items={myActivity} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
