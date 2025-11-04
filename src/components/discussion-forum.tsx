'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Discussion, User } from '@/lib/types';
import { toDate, timeAgo } from '@/lib/utils';

interface DiscussionForumProps {
  discussions: (Discussion & { user?: User })[];
  onAddComment: (content: string) => void;
  isMember: boolean;
  currentUser: User | null;
}

export default function DiscussionForum({
  discussions,
  onAddComment,
  isMember,
  currentUser,
}: DiscussionForumProps) {
  const [newComment, setNewComment] = useState('');

  const handlePostComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Discussion</h2>

      {/* New Comment Form */}
      {isMember ? (
        <div className="mb-8">
          <div className="flex items-start space-x-4">
            <Avatar>
              <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handlePostComment} disabled={!newComment.trim()}>
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <p>Join the project to participate in the discussion.</p>
        </div>
      )}

      {/* Display Discussions */}
      <div className="space-y-6">
        {discussions.map((discussion) => (
          <div key={discussion.id} className="flex items-start space-x-4">
            <Avatar>
              <AvatarImage src={discussion.user?.avatarUrl} alt={discussion.user?.name} />
              <AvatarFallback>{discussion.user?.name.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-gray-900 dark:text-white">{discussion.user?.name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {timeAgo(toDate(discussion.createdAt))}
                </p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{discussion.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
