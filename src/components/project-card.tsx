'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const isLead = currentUser ? project.team.some(member => member.userId === currentUser.id && member.role === 'lead') : false;
  const displayTags = project.tags || [];
  const recommendedPathLinks = allProjectPathLinks.filter(link => link.projectId === project.id);
  const recommendedPaths = recommendedPathLinks
      .map(link => allLearningPaths.find(p => p.pathId === link.learningPathId))
      .filter((p): p is LearningPath => !!p);

  const sortedTeamMembers = [...project.team].sort((a, b) => {
    const roleOrder = { lead: 0, contributor: 1, participant: 2 };
    return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
  });

  const visibleMembers = sortedTeamMembers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembersCount = sortedTeamMembers.length - MAX_VISIBLE_MEMBERS;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleProfileNavigation = (e: React.MouseEvent | React.KeyboardEvent, user: User) => {
    stopPropagation(e as React.MouseEvent);
    router.push(`/profile/${user.username || user.id}`);
  };
  
  const renderMemberAvatar = (member: HydratedProjectMember) => {
    const { user, role } = member;

    if (!user || !user.name) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Avatar className='border-2 border-background h-8 w-8'>
                            <AvatarFallback>
                                <UserIcon className='h-4 w-4 text-muted-foreground' />
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Unknown User</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger 
            asChild
            onClick={(e) => handleProfileNavigation(e, user)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleProfileNavigation(e, user);
              }
            }}
          >
            <span role="button" tabIndex={0} aria-label={`View profile of ${user.name}`} className="cursor-pointer">
              <Avatar className={cn('border-2 h-8 w-8', role === 'lead' ? 'border-yellow-500' : 'border-background')}>
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{user.name} - <span className="capitalize">{role}</span></p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
      <Card className={cn(
          'group relative flex flex-col overflow-hidden transition-all hover:shadow-lg',
          isLead && 'border-2 border-yellow-500',
          className
      )}>
          <Link href={`/projects/${project.id}`} className='contents'>
              <CardHeader className='relative p-0 h-48'>
                  <Image
                      src={project.imageUrl || '/images/project-placeholder.jpg'}
                      alt={project.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint="project image"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                  
                  <div className="relative flex flex-col justify-end h-full p-4 text-white">
                      {suggestionText && (
                      <div className='mb-3 flex items-start gap-2.5 text-sm bg-primary/90 text-primary-foreground p-3 rounded-md shadow-sm'>
                          <Sparkles className='h-4 w-4 mt-0.5 shrink-0' />
                          <p className='font-medium leading-relaxed'>{suggestionText}</p>
                      </div>
                      )}
                      <div className='flex items-center gap-2 mb-2'>
                          {displayTags.filter((tag: ProjectTag) => tag.type === 'category').slice(0, 2).map((tag: ProjectTag) => (
                              <Badge key={tag.id} variant={'secondary'} className='text-xs font-medium'>
                                  {tag.display}
                              </Badge>
                          ))}
                           {recommendedPaths.length > 0 && (
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger onClick={stopPropagation}>
                                          <Badge variant={'secondary'} className='flex items-center gap-1.5'>
                                              <BookOpen className='h-3 w-3' />
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
                      <CardTitle className='text-lg font-bold leading-tight group-hover:text-primary transition-colors'>
                          {project.name}
                      </CardTitle>
                      <CardDescription className='line-clamp-2 text-sm text-gray-300 pt-1'>
                          {project.tagline}
                      </CardDescription>
                  </div>
                  {project.isExpertReviewed && (
                      <div className="absolute top-2 right-2">
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger onClick={stopPropagation}>
                                      <CheckCircle className='h-5 w-5 text-green-400 bg-gray-800/50 rounded-full p-0.5' />
                                  </TooltipTrigger>
                                  <TooltipContent><p>Expert Reviewed</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      </div>
                  )}
              </CardHeader>
              <CardContent className='flex-grow p-4'>
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
                <div className='flex flex-grow items-center'>
                    <div className='flex items-end -space-x-2'>
                        {visibleMembers.map((member) => (
                            <div key={member.userId}>
                                {renderMemberAvatar(member)}
                            </div>
                        ))}
                    </div>
                    {hiddenMembersCount > 0 && (
                        <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                            <div className='ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'>
                                +{hiddenMembersCount}
                            </div>
                            </TooltipTrigger>
                            <TooltipContent onClick={stopPropagation}>
                            <p>
                                {sortedTeamMembers.slice(MAX_VISIBLE_MEMBERS).map(member => member.user?.name || 'Unknown').join(', ')}
                            </p>
                            </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
              </CardFooter>
          </Link>
      </Card>
  );
}
