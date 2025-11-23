'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// The autocomplete library provides the item as `entity`
// with the properties we define in the `data` array.
interface UserMentionItemProps {
  entity: {
    name: string;
    avatarUrl: string;
  };
}

export const UserMentionItem = ({ entity: { name, avatarUrl } }: UserMentionItemProps) => {
  return (
    <div className="flex items-center px-4 py-2 hover:bg-accent cursor-pointer">
      <Avatar className="h-8 w-8 mr-2">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>{name ? name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{name}</span>
    </div>
  );
};
