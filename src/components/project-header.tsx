'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FilePenLine, Star, StarOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HydratedProject, User } from '@/lib/types';
import { getDeterministicPlaceholder, cn } from '@/lib/utils';
import { toggleFollowProjectAction } from '@/app/actions/projects';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProjectHeaderProps {
  project: HydratedProject;
  currentUser: User | null;
  onJoin: () => void;
  onLeave: () => void;
}

export default function ProjectHeader({ project, currentUser, onJoin, onLeave }: ProjectHeaderProps) {
  const isMember = currentUser ? project.team.some(member => member.user.id === currentUser.id) : false;
  const isLead = currentUser ? project.team.some(member => member.user.id === currentUser.id && member.role === 'lead') : false;
  const leadCount = project.team.filter(m => m.role === 'lead').length;
  const fallbackImage = getDeterministicPlaceholder(project.id);
  const { toast } = useToast();

  const [isFollowing, setIsFollowing] = useState(currentUser?.followedProjectIds?.includes(project.id) || false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleToggleFollow = async () => {
    if (!currentUser) {
        toast({ title: 'Authentication required', description: 'Please login to follow projects.', variant: 'destructive' });
        return;
    }
    setIsFollowLoading(true);
    try {
        const result = await toggleFollowProjectAction(project.id);
        if (result.success && result.data) {
            setIsFollowing(result.data.isFollowing);
            toast({ 
                title: result.data.isFollowing ? 'Following Project' : 'Unfollowed Project',
                description: result.data.isFollowing ? `You will now see updates for ${project.name} in your feed.` : `You will no longer see updates for ${project.name}.`
            });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    } finally {
        setIsFollowLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      {/* Project Image */}
      <div className="w-full h-64 relative mb-4 rounded-lg overflow-hidden">
        <Image 
          src={project.photoUrl || fallbackImage}
          alt={`${project.name} photo`}
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 italic">
            {project.tagline}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2">
            {!isMember && currentUser && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleToggleFollow} 
                    disabled={isFollowLoading}
                    className={cn(isFollowing && "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-400")}
                >
                    {isFollowLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                        <StarOff className="h-4 w-4 mr-2" />
                    ) : (
                        <Star className="h-4 w-4 mr-2" />
                    )}
                    {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
            )}
            {isLead && (
                <Link href={`/projects/${project.id}/edit`} passHref>
                    <Button variant="outline" size="sm">
                        <FilePenLine className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                </Link>
            )}
            {!isMember && currentUser && (
                <Button onClick={onJoin}>
                    Join Project
                </Button>
            )}
            {isMember && (!isLead || leadCount > 1) && (
                <Button variant="ghost" size="sm" onClick={onLeave} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Leave Project
                </Button>
            )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {project.tags?.map(tag => (
          <Badge key={tag.id} variant={tag.isCategory ? 'secondary' : 'outline'}>{tag.display}</Badge>
        ))}
      </div>
    </div>
  );
}
