'use client';

import { HydratedActivity } from "./page";
import { renderActivityMessage, toSafeDate } from "./utils";
import { timeAgo } from "@/lib/utils";

import { UserAvatar } from "@/components/user-avatar";

interface ActivityListProps {
    items: HydratedActivity[];
}

export default function ActivityList({ items }: ActivityListProps) {
    if (!items || items.length === 0) {
        return <p>No activity to display.</p>;
    }

    return (
        <ul className="space-y-4">
          {items.map(item => (
            <li key={item.id} className="p-4 border rounded-lg shadow-sm">
              <div className="flex items-center space-x-4">
                <UserAvatar user={item.actor} className="w-10 h-10 shrink-0" />
                <div className="flex-1">
                  <p>
                    <strong>{item.actor.name || item.actor.username || 'User'}</strong>
                    {' '}
                    {renderActivityMessage(item)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {timeAgo(toSafeDate(item.timestamp))}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      );
    }
