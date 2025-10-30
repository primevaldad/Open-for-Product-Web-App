
'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle, Sparkles, User as UserIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HydratedProject, HydratedProjectMember, User, ProjectTag, ProjectPathLink, LearningPath } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';

interface ProjectCardProps {
  project: HydratedProject;
  currentUser: User | null;
  className?: string;
  allProjectPathLinks: ProjectPathLink[];
  allLearningPaths: LearningPath[];
  suggestionText?: string;
}

const MAX_VISIBLE_MEMBERS = 4;

export default function ProjectCard({ 
    project, 
    currentUser,
    className, 
    allProjectPathLinks, 
    allLearningPaths, 
    suggestionText 
}: ProjectCardProps) {
  const isLead = currentUser ? project.team.some(member => member.userId === currentUser.id && member.role === 'lead') : false;

  const displayTags = project.tags || [];

  const recommendedPathLinks = allProjectPathLinks.filter(link => link.projectId === project.id);
  const recommendedPaths = recommendedPathLinks
      .map(link => allLearningPaths.find(p => p.pathId === link.learningPathId))
      .filter((p): p is LearningPath => !!p);

  // Sort team members directly from the project prop.
  // This removes the need for a separate state and useEffect.
  const sortedTeamMembers = [...project.team].sort((a, b) => {
    const roleOrder = { lead: 0, contributor: 1, participant: 2 };
    return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
  });

  const visibleMembers = sortedTeamMembers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembersCount = sortedTeamMembers.length - MAX_VISIBLE_MEMBERS;

  const renderMemberAvatar = (member: HydratedProjectMember) => {
    if (!member.user) return null; // Should not happen with hydrated data
    const { user, role } = member;
    return (
      <TooltipProvider key={user.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/profile/${user.id}`}>
              <Avatar className={cn(
                  'border-2 border-background h-8 w-8',
                  role === 'lead' && 'border-yellow-500',
                  {
                      'h-10 w-10 opacity-100': role === 'lead',
                      'opacity-70': role === 'contributor',
                      'opacity-50': role === 'participant',
                  }
              )}>
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint='person portrait' />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{user.name} - {role}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card className={cn(
        'flex flex-col transition-all hover:shadow-lg hover:-translate-y-1',
        isLead && 'border-2 border-yellow-500',
        className
    )}>
      <CardHeader className='relative p-4'>
        {suggestionText && (
          <div className='mb-3 flex items-start gap-2.5 text-sm text-primary-foreground bg-primary/90 p-3 rounded-md shadow-sm'>
            <Sparkles className='h-4 w-4 mt-0.5 shrink-0' />
            <p className='font-medium leading-relaxed'>{suggestionText}</p>
          </div>
        )}

        <div className='flex items-start justify-between'>
            <div className='flex-1'>
                <div className='mb-2 flex flex-wrap items-center gap-2'>
                    {displayTags.filter((tag: ProjectTag) => tag.type === 'category').slice(0, 3).map((tag: ProjectTag) => (
                        <Badge
                            key={tag.id}
                            variant={'default'}
                            className='text-xs font-medium'
                        >
                            {tag.display}
                        </Badge>
                    ))}
                    {recommendedPaths.length > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Badge variant={'secondary'} className='flex items-center gap-1.5'>
                                        <BookOpen className='h-4 w-4' />
                                        {recommendedPaths.length}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className='font-semibold mb-1'>Recommended Learning:</p>
                                    <ul className='list-disc list-inside'>
                                        {recommendedPaths.map(p => <li key={p.pathId}>{p.title}</li>)}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <CardTitle className='text-lg font-bold'>
                <Link href={`/projects/${project.id}`} className='hover:text-primary transition-colors'>
                    {project.name}
                </Link>
                </CardTitle>
            </div>
            <div className='ml-4 flex shrink-0 items-center gap-2'>
                {project.isExpertReviewed && (
                    <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                        <CheckCircle className='h-5 w-5 text-green-500' />
                        </TooltipTrigger>
                        <TooltipContent><p>Expert Reviewed</p></TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
        <CardDescription className='line-clamp-2 text-sm pt-2'>{project.tagline}</CardDescription>
      </CardHeader>
      <CardContent className='flex-grow p-4 pt-0'>
        <div className='mb-4'>
          <div className='mb-1 flex justify-between text-xs text-muted-foreground'>
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className='h-2' />
        </div>

        <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
            <Sparkles className='h-4 w-4 text-amber-500' />
            <span>AI Forecast: High Potential</span>
        </div>
      </CardContent>
      <CardFooter className='flex items-center justify-between bg-muted/50 p-4 mt-auto'>
        <div className='flex items-end'>
            {currentUser && currentUser.role !== 'guest' ? (
                <>
                    <div className='flex items-end -space-x-2'>
                        {visibleMembers.map(renderMemberAvatar)}
                    </div>
                    {hiddenMembersCount > 0 && (
                        <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <div className='ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'>
                                +{hiddenMembersCount}
                            </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                  {sortedTeamMembers.slice(MAX_VISIBLE_MEMBERS).map(member => member.user?.name || 'Unknown').join(', ')}
                              </p>
                            </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                    )}
                </>
            ) : (
                <>
                    <div className='flex items-end -space-x-2'>
                        {project.team.slice(0, MAX_VISIBLE_MEMBERS).map((member, index) => (
                            <Avatar key={index} className='border-2 border-background h-8 w-8'>
                                <AvatarFallback>
                                    <UserIcon className='h-4 w-4 text-muted-foreground' />
                                </AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    {project.team.length > MAX_VISIBLE_MEMBERS && (
                        <div className='ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'>
                            +{project.team.length - MAX_VISIBLE_MEMBERS}
                        </div>
                    )}
                </>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
