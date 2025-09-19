
'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Project, User, ProjectTag, ProjectPathLink, LearningPath } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';
import { findUserById } from '@/lib/data.client';

interface ProjectCardProps {
  project: Project;
  className?: string;
  allProjectPathLinks: ProjectPathLink[];
  allLearningPaths: LearningPath[];
  suggestionText?: string; // Add the new optional prop
}

export default function ProjectCard({ 
    project, 
    className, 
    allProjectPathLinks, 
    allLearningPaths, 
    suggestionText 
}: ProjectCardProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const displayTags = project.tags || [];

  // Find recommended paths for this specific project
  const recommendedPathLinks = allProjectPathLinks.filter(link => link.projectId === project.id);
  const recommendedPaths = recommendedPathLinks
      .map(link => allLearningPaths.find(p => p.id === link.learningPathId))
      .filter((p): p is LearningPath => !!p);

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
        {/* Display the AI suggestion if it exists */}
        {suggestionText && (
          <div className="mb-3 flex items-start gap-2.5 text-sm text-primary-foreground bg-primary/90 p-3 rounded-md shadow-sm">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="font-medium leading-relaxed">{suggestionText}</p>
          </div>
        )}

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </TooltipTrigger>
                <TooltipContent><p>Expert Reviewed</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider key={member.id}>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent><p>{member.name}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            {recommendedPaths.length > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="secondary" className="flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4" />
                                {recommendedPaths.length}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-semibold mb-1">Recommended Learning:</p>
                            <ul className="list-disc list-inside">
                                {recommendedPaths.map(p => <li key={p.id}>{p.title}</li>)}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {project.votes}
            </span>
        </div>
      </CardFooter>
    </Card>
  );
}
