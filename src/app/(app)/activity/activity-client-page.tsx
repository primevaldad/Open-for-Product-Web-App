'use client';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { ActivityList } from './activity-list';
import type { HydratedActivityItem } from './utils';
import { User } from '../../../lib/types'; // Assuming User type is here
import { HydratedProject } from 'src/lib/types'; // Assuming HydratedProject type is here

/**
 * Defines the props for the client-side Activity page component.
 * It receives the pre-hydrated activity items from its parent server component.
 */
export interface ActivityClientPageProps {
  activity: HydratedActivityItem[];
  currentUser: User;
  projects: HydratedProject[];
  users: User[];
}

/**
 * ActivityClientPage is the client-side component responsible for rendering the 
 * main activity feed UI, including tabs and the list of activities.
 */
export function ActivityClientPage({ activity, currentUser, projects, users }: ActivityClientPageProps) {
  return (
    <div className="container mx-auto p-4">
      <Tabs>
        <TabList>
          <Tab>Activity</Tab>
        </TabList>

        <TabPanel>
          <div className="mt-4">
            <ActivityList items={activity} />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}