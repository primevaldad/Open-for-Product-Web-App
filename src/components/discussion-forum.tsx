'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Discussion, User } from '@/lib/types';
import { toDate, timeAgo } from '@/lib/utils';
import { MarkdownEditor } from '@/components/markdown-editor';
import Markdown from '@/components/ui/markdown';

export type HydratedDiscussion = Discussion & { user?: User; replies: HydratedDiscussion[] };

const MAX_NESTING_DEPTH = 3;

interface DiscussionForumProps {
  discussions: HydratedDiscussion[];
  onAddComment: (content: string, parentId?: string) => void;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  isMember: boolean;
  currentUser: User | null;
  users: User[];
  isProjectLead?: boolean;
}

interface CommentProps {
  discussion: HydratedDiscussion;
  onAddComment: (content: string, parentId?: string) => void;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  isMember: boolean;
  currentUser: User | null;
  users: User[];
  depth: number;
  isProjectLead?: boolean;
}

function Comment({ 
  discussion, 
  onAddComment, 
  onEditComment,
  onDeleteComment,
  isMember, 
  currentUser, 
  users, 
  depth,
  isProjectLead
}: CommentProps) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(discussion.content);

  const handlePostReply = () => {
    if (replyContent.trim()) {
      onAddComment(replyContent.trim(), discussion.id);
      setReplyContent('');
      setShowReply(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== discussion.content && onEditComment) {
      await onEditComment(discussion.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const isDeleted = !!discussion.deletedAt;

  return (
    <div className="flex items-start space-x-4">
      <Avatar className={isDeleted ? "opacity-50" : ""}>
        <AvatarImage src={discussion.user?.avatarUrl} alt={discussion.user?.name} />
        <AvatarFallback>{discussion.user?.name?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <div className="flex items-center space-x-2 flex-wrap">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{discussion.user?.name || 'Unknown User'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {timeAgo(toDate(discussion.createdAt))}
          </p>
          {discussion.editedAt && !isDeleted && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded italic">
              (edited)
            </span>
          )}
        </div>
        
        {isDeleted ? (
          <div className="mt-1.5 text-xs italic text-muted-foreground bg-muted/30 border border-dashed border-border rounded-md px-3 py-2 max-w-fit">
            Comment deleted by {discussion.deletedBy || 'author'}
          </div>
        ) : isEditing ? (
          <div className="mt-2 space-y-2">
            <MarkdownEditor
              value={editContent}
              onChange={setEditContent}
              users={users}
              placeholder="Edit your comment..."
            />
            <div className="flex space-x-2 justify-end mt-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditContent(discussion.content); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || editContent === discussion.content}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 prose dark:prose-invert max-w-none text-sm">
            <Markdown content={discussion.content} />
          </div>
        )}

        {!isDeleted && (
          <div className="flex items-center space-x-3 mt-1.5">
            {isMember && depth < MAX_NESTING_DEPTH && (
              <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setShowReply(!showReply)}>
                Reply
              </Button>
            )}
            {currentUser && discussion.userId === currentUser.id && (
              <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            {currentUser && (discussion.userId === currentUser.id || isProjectLead) && (
              <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground hover:text-destructive" onClick={() => {
                if (window.confirm("Are you sure you want to delete this comment?")) {
                  onDeleteComment?.(discussion.id);
                }
              }}>
                Delete
              </Button>
            )}
          </div>
        )}

        {showReply && (
          <div className="mt-4">
            <div className="flex items-start space-x-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name} />
                <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <MarkdownEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder={`Replying to ${discussion.user?.name}...`}
                  users={users}
                />
                <div className="flex justify-end space-x-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>Cancel</Button>
                    <Button size="sm" onClick={handlePostReply} disabled={!replyContent.trim()}>
                        Post Reply
                    </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {discussion.replies && discussion.replies.length > 0 && (
          <div className="mt-4 space-y-4 pl-6 border-l border-gray-200 dark:border-gray-700">
            {discussion.replies.map((reply) => (
              <Comment 
                key={reply.id} 
                discussion={reply} 
                onAddComment={onAddComment} 
                onEditComment={onEditComment}
                onDeleteComment={onDeleteComment}
                isMember={isMember} 
                currentUser={currentUser} 
                users={users}
                depth={depth + 1}
                isProjectLead={isProjectLead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscussionForum({
  discussions,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isMember,
  currentUser,
  users,
  isProjectLead
}: DiscussionForumProps) {
  const [newComment, setNewComment] = useState('');

  const handlePostComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="bg-background shadow-sm rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Discussion</h2>

      {isMember ? (
        <div className="mb-8">
          <div className="flex items-start space-x-4">
            <Avatar>
              <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <MarkdownEditor
                value={newComment}
                onChange={setNewComment}
                placeholder="Share your thoughts..."
                users={users}
              />
              <Button onClick={handlePostComment} disabled={!newComment.trim()} className="mt-2">
                Post Comment
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground mb-8 p-4 bg-muted rounded-md">
          <p>Join the project to participate in the discussion.</p>
        </div>
      )}

      <div className="space-y-6">
        {discussions.map((discussion) => (
          <Comment 
            key={discussion.id} 
            discussion={discussion} 
            onAddComment={onAddComment} 
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            isMember={isMember} 
            currentUser={currentUser} 
            users={users}
            depth={0}
            isProjectLead={isProjectLead}
          />
        ))}
      </div>
    </div>
  );
}
