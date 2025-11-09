'use client';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { ActivityList } from './activity-list';
import type { HydratedActivityItem } from './utils';

/**
 * Defines the props for the client-side Activity page component.
 * It receives the pre-hydrated activity items from its parent server component.
 */
export interface ActivityClientPageProps {
  activity: HydratedActivityItem[];
}

/**
 * ActivityClientPage is the client-side component responsible for rendering the 
 * main activity feed UI, including tabs and the list of activities.
 */
export function ActivityClientPage({ activity }: ActivityClientPageProps) {
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
