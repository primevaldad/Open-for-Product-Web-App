'use client';

import Link from 'next/link';
import { FilePenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Markdown from '@/components/ui/markdown';
import type { HydratedProject, User } from '@/lib/types';

interface ProjectHeaderProps {
  project: HydratedProject;
  currentUser: User | null;
  onJoin: () => void;
}

export default function ProjectHeader({ project, currentUser, onJoin }: ProjectHeaderProps) {
  const isMember = currentUser ? project.team.some(member => member.userId === currentUser.id) : false;
  const isLead = currentUser ? project.team.some(member => member.userId === currentUser.id && member.role === 'lead') : false;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
          <div className="text-gray-600 dark:text-gray-300 mt-2">
            <Markdown content={project.description} />
          </div>
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
