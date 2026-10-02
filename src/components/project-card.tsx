'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle, Sparkles, Star, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HydratedProject, HydratedProjectMember, User, ProjectTag, ProjectPathLink, LearningPath } from '@/lib/types';
import { cn, getInitials, getDeterministicPlaceholder } from '@/lib/utils';
import { buildHybridUrl } from '@/lib/slug';
import { useToast } from '@/hooks/use-toast';
import { toggleProjectFeaturedAction } from '@/app/actions/projects';

interface ProjectCardProps {
  project: HydratedProject;
  currentUser: User | null;
  className?: string;
  allProjectPathLinks: ProjectPathLink[];
  allLearningPaths: LearningPath[];
  suggestionText?: string;
  priority?: boolean;
  onFeaturedToggle?: (projectId: string, isFeatured: boolean) => void;
}

const MAX_VISIBLE_MEMBERS = 4;

export default function ProjectCard({ 
    project, 
    currentUser,
    className, 
    allProjectPathLinks, 
    allLearningPaths, 
    suggestionText,
    priority = false,
    onFeaturedToggle,
}: ProjectCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'admin';
  const isPublic = (project.project_type === 'public' || !project.project_type) && project.status === 'published';
  const [isFeatured, setIsFeatured] = useState(!!project.featured);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

  useEffect(() => {
    setIsFeatured(!!project.featured);
  }, [project.featured]);

  const handleToggleFeatured = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isTogglingFeatured) return;

    const nextState = !isFeatured;
    if (nextState && !isPublic) {
      toast({
        variant: 'destructive',
        title: 'Cannot Feature Project',
        description: 'Only published, public projects can be featured on the marketing site.',
      });
      return;
    }

    setIsFeatured(nextState);
    setIsTogglingFeatured(true);

    try {
      const res = await toggleProjectFeaturedAction(project.id, nextState);
      if (!res.success) {
        setIsFeatured(!nextState);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.error || 'Failed to update featured status.',
        });
      } else {
        toast({
          title: nextState ? 'Project Featured' : 'Project Unfeatured',
          description: `"${project.name}" is ${nextState ? 'now featured on the marketing site.' : 'no longer featured.'}`,
        });
        onFeaturedToggle?.(project.id, nextState);
      }
    } catch {
      setIsFeatured(!nextState);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsTogglingFeatured(false);
    }
  };

  
  const team = Array.isArray(project.team) ? project.team : [];
  const tags = Array.isArray(project.tags) ? project.tags : [];

  const isLead = currentUser ? team.some(member => member.userId === currentUser.id && member.role === 'lead') : false;
  const recommendedPathLinks = allProjectPathLinks.filter(link => link.projectId === project.id);
  const recommendedPaths = recommendedPathLinks
      .map(link => allLearningPaths.find(p => p.pathId === link.learningPathId))
      .filter((p): p is LearningPath => !!p);

  const fallbackImage = getDeterministicPlaceholder(project.id);

  const sortedTeamMembers = [...team].sort((a, b) => {
    const roleOrder = { lead: 0, contributor: 1, participant: 2 };
    return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
  });

  const uniqueMemberIds = new Set();
  const uniqueMembers = sortedTeamMembers.filter(member => {
    if (!member.userId || uniqueMemberIds.has(member.userId)) {
      return false;
    }
    uniqueMemberIds.add(member.userId);
    return true;
  });

  const visibleMembers = uniqueMembers.slice(0, MAX_VISIBLE_MEMBERS);
  const hiddenMembersCount = uniqueMembers.length - MAX_VISIBLE_MEMBERS;

  const handleNavigation = (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      router.push(path);
  };
  
  const renderMemberAvatar = (member: HydratedProjectMember) => {
    const { user, role } = member;

    if (!user || !user.name) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="pointer-events-auto relative z-30">
                        <Avatar className='border-2 border-background h-8 w-8'>
                            <AvatarFallback>
                                <UserIcon className='h-4 w-4 text-muted-foreground' />
                            </AvatarFallback>
                        </Avatar>
                    </span>
                </TooltipTrigger>
                <TooltipContent className="pointer-events-none"><p>Unknown User</p></TooltipContent>
            </Tooltip>
        );
    }

    const profileUrl = buildHybridUrl('/profile', user.id, user.username || user.name);
    
    return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={profileUrl} className="pointer-events-auto relative z-30 cursor-pointer focus:outline-none block rounded-full">
              <Avatar className={cn('border-2 h-8 w-8', role === 'lead' ? 'border-yellow-500' : 'border-background')}>
                {user.avatarUrl && (
                  <AvatarImage asChild src={user.avatarUrl}>
                    <Image src={user.avatarUrl} alt={user.name || "Avatar"} fill sizes="32px" className="object-cover" />
                  </AvatarImage>
                )}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent className="pointer-events-none">
            <p>{user.name} - <span className="capitalize">{role}</span></p>
          </TooltipContent>
        </Tooltip>
    );
  };

  return (
    <Card 
      className={cn(
        'group relative flex flex-col overflow-hidden [isolation:isolate] [-webkit-font-smoothing:subpixel-antialiased] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-[#fffaf2] border-[#dfd5c5]',
        isLead && 'border-2 border-yellow-500',
        className
      )}
    >
      <Link href={buildHybridUrl('/projects', project.id, project.name)} className="absolute inset-0 z-10 focus:outline-none" aria-label={`View project ${project.name}`} />
      
      <CardHeader className='relative z-20 pointer-events-none p-0 h-48 [isolation:isolate]'>
              <Image
                  src={project.photoUrl || fallbackImage}
                  alt={project.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={priority}
                  data-ai-hint="project image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              
              <div className="relative flex flex-col justify-end h-full p-4 text-slate-100">
                  {suggestionText && (
                  <div className='mb-3 flex items-start gap-2.5 text-sm bg-primary/90 text-primary-foreground p-3 rounded-md shadow-sm'>
                      <Sparkles className='h-4 w-4 mt-0.5 shrink-0' />
                      <p className='font-medium leading-relaxed'>{suggestionText}</p>
                  </div>
                  )}
                  <div className='flex flex-wrap items-center gap-2 mb-2'>
                      {tags
                          .sort((a, b) => (b.isCategory ? 1 : 0) - (a.isCategory ? 1 : 0))
                          .slice(0, 3)
                          .map((tag: ProjectTag) => (
                              <Badge key={tag.id} variant={tag.isCategory ? 'secondary' : 'outline'} className='text-xs font-medium pointer-events-auto relative z-30'>
                                  {tag.display}
                              </Badge>
                          ))}
                       {recommendedPaths.length > 0 && (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Badge variant={'secondary'} className='flex items-center gap-1.5 cursor-default pointer-events-auto relative z-30'>
                                      <BookOpen className='h-3 w-3' />
                                      {recommendedPaths.length}
                                  </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="pointer-events-none">
                                  <p className='font-semibold mb-1'>Recommended Learning:</p>
                                  <ul className='list-disc list-inside'>
                                      {recommendedPaths.map(p => <li key={p.pathId}>{p.title}</li>)}
                                  </ul>
                              </TooltipContent>
                          </Tooltip>
                      )}
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg backdrop-blur-sm border border-white/10">
                    <CardTitle className='text-lg font-bold leading-tight transition-colors'>
                        {project.name}
                    </CardTitle>
                    <CardDescription className='line-clamp-2 text-sm text-slate-300 pt-1'>
                        {project.tagline}
                    </CardDescription>
                  </div>
              </div>
              {/* Header Badges & Admin Actions */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
                  {isAdmin && (
                      isPublic || isFeatured ? (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <button
                                      type="button"
                                      onClick={handleToggleFeatured}
                                      disabled={isTogglingFeatured}
                                      className={cn(
                                          "pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md transition-all duration-200 backdrop-blur-md cursor-pointer",
                                          isFeatured
                                              ? "bg-amber-500 text-white hover:bg-amber-600 border border-amber-300"
                                              : "bg-black/60 text-slate-200 hover:bg-black/80 hover:text-white border border-white/20"
                                      )}
                                      aria-label={isFeatured ? "Unfeature project" : "Feature project"}
                                  >
                                      <Star className={cn("h-3.5 w-3.5", isFeatured ? "fill-white text-white" : "text-slate-300")} />
                                      <span>{isFeatured ? "Featured" : "Feature"}</span>
                                  </button>
                              </TooltipTrigger>
                              <TooltipContent className="pointer-events-none">
                                  <p>{isFeatured ? "Click to remove from marketing site" : "Click to feature on marketing site"}</p>
                              </TooltipContent>
                          </Tooltip>
                      ) : (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div
                                      className="pointer-events-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-md backdrop-blur-md bg-black/40 text-slate-400 border border-white/10 opacity-60 cursor-not-allowed"
                                      aria-label="Cannot feature non-public project"
                                  >
                                      <Star className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Feature</span>
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent className="pointer-events-none">
                                  <p>Only published, public projects can be featured ({project.status !== 'published' ? project.status : project.project_type || 'non-public'})</p>
                              </TooltipContent>
                          </Tooltip>
                      )
                  )}
                  {!isAdmin && isFeatured && isPublic && (
                      <Badge className="bg-amber-500/90 text-white border-none shadow-sm flex items-center gap-1 text-[11px] px-2 py-0.5">
                          <Star className="h-3 w-3 fill-white text-white" />
                          Featured
                      </Badge>
                  )}
                  {project.isExpertReviewed && (
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <span className="cursor-default pointer-events-auto relative">
                                  <CheckCircle className='h-5 w-5 text-green-400 bg-gray-800/50 rounded-full p-0.5' />
                              </span>
                          </TooltipTrigger>
                          <TooltipContent className="pointer-events-none"><p>Expert Reviewed</p></TooltipContent>
                      </Tooltip>
                  )}
              </div>
          </CardHeader>
          <CardContent className='relative z-20 pointer-events-none flex-grow p-4'>
            <div className='mb-4'>
              <div className='mb-1 flex justify-between text-xs text-muted-foreground'>
                <span>Progress</span>
                <span>{project.progress || 0}%</span>
              </div>
              <Progress value={project.progress || 0} className='h-2' />
            </div>
            <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <Sparkles className='h-4 w-4 text-amber-500' />
                <span>Jester forecast: {project.progress ? (project.progress > 50 ? 'Strong momentum, high viability' : 'Building foundational momentum') : 'Analyzing project state...'}</span>
            </div>
          </CardContent>
          <CardFooter className='relative z-20 pointer-events-none flex items-center justify-between bg-muted/50 p-4 mt-auto'>
            <div className='flex flex-grow items-center'>
                <div className='flex items-end -space-x-2'>
                    {visibleMembers.map((member) => (
                        <div key={member.userId}>
                            {renderMemberAvatar(member)}
                        </div>
                    ))}
                </div>
                {hiddenMembersCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <div className='pointer-events-auto relative z-30 ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground cursor-default'>
                            +{hiddenMembersCount}
                        </div>
                        </TooltipTrigger>
                        <TooltipContent className="pointer-events-none">
                        <p>
                            {uniqueMembers.slice(MAX_VISIBLE_MEMBERS).map(member => member.user?.name || 'Unknown').join(', ')}
                        </p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
          </CardFooter>
      </Card>
  );
}
