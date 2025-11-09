import React from 'react';
import type { HydratedActivityItem } from './utils';

interface ActivityListProps {
  items: HydratedActivityItem[];
}

/**
 * A simple component that renders a list of activity items.
 */
export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return <p>No activity to display.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map(item => (
        <li key={item.id} className="p-4 border rounded-lg shadow-sm">
          <div className="flex items-center space-x-4">
            <img src={item.actor.avatarUrl || ''} alt={item.actor.name} className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <p>
                <strong>{item.actor.name}</strong>
                {' '}
                {renderActivityMessage(item)}
              </p>
              <p className="text-sm text-gray-500">
                {item.timestamp.toLocaleString()}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders a human-readable message for an activity item.
 */
function renderActivityMessage(item: HydratedActivityItem) {
  switch (item.type) {
    case 'project-created':
      return (
        <span>
          created the project <strong>{item.context.projectName}</strong>
        </span>
      );
    // Add more cases here for other activity types in the future
    default:
      return <span>performed an action.</span>;
  }
}
