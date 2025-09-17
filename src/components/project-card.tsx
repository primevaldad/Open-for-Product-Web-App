
'use client';

import Link from 'next/link';
import { CheckCircle, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Project, User, ProjectTag } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';
import { findUserById } from '@/lib/data.client';

interface ProjectCardProps {
  project: Project;
  className?: string;
}

export default function ProjectCard({ project, className }: ProjectCardProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const displayTags = project.tags || [];

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const members = await Promise.all(project.team.map(member => findUserById(member.userId)));
      setTeamMembers(members.filter((m): m is User => !!m));
    };

    if (project.team) {
        fetchTeamMembers();
    }
  }, [project.team]);

  return (
    <Card className={cn("flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1", className)}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
                {displayTags.filter((tag: ProjectTag) => tag.role === 'category').map((tag: ProjectTag) => (
                    <Badge
                        key={tag.id}
                        variant={"default"}
                        className="text-xs font-medium"
                    >
                        {tag.display}
                    </Badge>
                ))}
            </div>
            <CardTitle className="text-lg font-bold">
              <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">
                {project.name}
              </Link>
            </CardTitle>
          </div>
          {project.isExpertReviewed && (
            <Tooltip>
              <TooltipTrigger>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </TooltipTrigger>
              <TooltipContent><p>Expert Reviewed</p></TooltipContent>
            </Tooltip>
          )}
        </div>
        <CardDescription className="line-clamp-2 text-sm">{project.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>AI Forecast: High Potential</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4 mt-auto">
        <div className="flex -space-x-2">
          {teamMembers.map((member) => (
            <Tooltip key={member.id}>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent><p>{member.name}</p></TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {project.votes}
            </span>
        </div>
      </CardFooter>
    </Card>
  );
}
