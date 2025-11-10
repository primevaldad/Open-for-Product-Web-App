'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FilePenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HydratedProject, User } from '@/lib/types';
import { getDeterministicPlaceholder } from '@/lib/utils';

interface ProjectHeaderProps {
  project: HydratedProject;
  currentUser: User | null;
  onJoin: () => void;
}

export default function ProjectHeader({ project, currentUser, onJoin }: ProjectHeaderProps) {
  const isMember = currentUser ? project.team.some(member => member.user.id === currentUser.id) : false;
  const isLead = currentUser ? project.team.some(member => member.user.id === currentUser.id && member.role === 'lead') : false;
  const fallbackImage = getDeterministicPlaceholder(project.id);

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
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {project.tags?.map(tag => (
          <Badge key={tag.id} variant="secondary">{tag.display}</Badge>
        ))}
      </div>
    </div>
  );
}
