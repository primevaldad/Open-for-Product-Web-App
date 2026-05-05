'use client';

import { useEffect, useState } from 'react';
import { Award, Lock, Pencil, Rocket, Link2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User, HydratedProject, LearningPath, ProjectPathLink, SteemAccount, SteemPost } from '@/lib/types';
import { getSteemUserAction, syncSteemPostsAction } from '@/app/actions/steem';
import Markdown from '@/components/ui/markdown';

const badges = [
  { name: 'First Contribution', icon: Award, isEarned: (projects: HydratedProject[]) => projects.length > 0 },
  { name: 'Community Helper', icon: Award, isEarned: (projects: HydratedProject[]) => projects.length > 2 }, // Example criteria
  { name: 'Project Starter', icon: Award, isEarned: (projects: HydratedProject[], userId: string) => projects.some(p => p.owner?.id === userId) },
  { name: 'Bug Squasher', icon: Award, isEarned: () => false }, // Placeholder
  { name: 'Creative Spark', icon: Award, isEarned: () => false }, // Placeholder
];

interface UserProfileClientPageProps {
  user: User;
  userProjects: HydratedProject[];
  isCurrentUserProfile: boolean;
  allLearningPaths: LearningPath[];
  allProjectPathLinks: ProjectPathLink[];
  currentUser: User;
}

const SteemLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={cn("h-4 w-4", className)}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M16.142 2l-2.072 2.646c1.32.42 2.454 1.253 3.242 2.373l2.046-2.613c-1.026-1.15-2.062-2.146-3.216-2.406zm-6.68 1.455l-2.071 2.646c.866.425 1.62.993 2.222 1.666l2.046-2.613c-.643-.593-1.4-.95-2.197-1.699zm10.538 4.545l-2.071 2.646c.15.534.227 1.1.227 1.682l2.046-2.613c.134-.787.05-1.464-.202-1.715zm-16.002 1l-2.07 2.646c-.15.534-.227 1.1-.227 1.682l2.045-2.613c-.133-.787-.049-1.464.202-1.715zm12.756 1.455l-2.071 2.646c.42 1.32 1.253 2.454 2.373 3.242l2.613-2.046c-1.15-1.026-2.146-2.062-2.915-3.842zm-6.68 1.455l-2.071 2.646c.425.866.993 1.62 1.666 2.222l2.613-2.046c-.593-.643-.95-1.4-1.699-2.197zm1.455 6.68l-2.646 2.071c.425.866.993 1.62 1.666 2.222l2.613-2.046c-.593-.643-.95-1.4-1.633-2.247zm-5.455-2.545l-2.646 2.071c1.32.42 2.454 1.253 3.242 2.373l2.613-2.046c-1.15-1.026-2.146-2.062-3.209-2.398z"/>
  </svg>
);

export default function UserProfilePageClient({ 
  user, 
  userProjects, 
  isCurrentUserProfile, 
  allLearningPaths, 
  allProjectPathLinks,
  currentUser 
}: UserProfileClientPageProps) {
  const [isLoadingSteem, setIsLoadingSteem] = useState(true);
  const [steemUser, setSteemUser] = useState<SteemAccount | null>(null);
  const [steemError, setSteemError] = useState<string | null>(null);

  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [steemPosts, setSteemPosts] = useState<SteemPost[] | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);

  // --- Formatting Helpers ---

  const formatReputation = (rep: string | number) => {
    const repNum = Number(rep);
    if (isNaN(repNum) || repNum === 0) return ' (25)';
    const score = Math.floor(Math.log10(Math.abs(repNum)) - 9) * 9 + 25;
    return `(${score})`;
  };

  const formatVotingPower = (power: number) => {
    return `${(power / 100).toFixed(2)}%`;
  };

  useEffect(() => {
    if (user.steemUsername) {
      // Fetch Steem Profile
      setIsLoadingSteem(true);
      getSteemUserAction(user.steemUsername)
        .then(response => {
          if (response.error) {
            setSteemError(response.error);
            setSteemUser(null);
          } else {
            setSteemUser(response.account);
            setSteemError(null);
          }
        })
        .catch(error => {
          console.error('Unexpected error calling getSteemUserAction:', error);
          setSteemError('An unexpected client-side error occurred.');
          setSteemUser(null);
        })
        .finally(() => {
          setIsLoadingSteem(false);
        });

      // Sync and fetch Steem Posts
      setIsLoadingPosts(true);
      syncSteemPostsAction(user.steemUsername)
        .then(response => {
          if (response.error) {
            setPostsError(response.error);
          }
           else {
            setPostsError(null);
          }
          setSteemPosts(response.posts);
        })
        .catch(error => {
          console.error('Unexpected error calling syncSteemPostsAction:', error);
          setPostsError('An unexpected client-side error occurred.');
          setSteemPosts(null);
        })
        .finally(() => {
          setIsLoadingPosts(false);
        });
    } else {
      setIsLoadingSteem(false);
      setIsLoadingPosts(false);
    }
  }, [user.steemUsername]);

  const steemProfile = (() => {
    if (!steemUser?.posting_json_metadata) {
      return null;
    }
    try {
      return JSON.parse(steemUser.posting_json_metadata).profile;
    } catch (e) {
      console.error('Failed to parse Steem posting_json_metadata:', e);
      return null;
    }
  })();

  return (
    <div className='flex h-full min-h-screen w-full bg-background'>
      <main className='flex-1 overflow-auto'>
        <div className='relative h-48 w-full bg-primary/10'>
          <div className='absolute -bottom-16 left-6'>
            <div className="relative">
              <Avatar className='h-32 w-32 rounded-full border-4 border-background'>
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.name}
                  data-ai-hint='person portrait'
                />
                <AvatarFallback className='text-4xl'>
                  {user.name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              {user.steemIconOverlay && (
                <div className="absolute -bottom-1 -right-1 bg-[#3c4fe0] rounded-full p-1.5 border-2 border-background shadow-sm">
                  <SteemLogo className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className='p-6 pt-20 flex justify-between items-start'>
          <div>
            <div className="flex items-center gap-3">
                <h1 className='text-3xl font-bold'>{user.name}</h1>
                {user.steemVerified && (
                    <Badge variant="outline" className="text-green-500 bg-green-500/10 border-green-500/20 gap-1 px-2 py-1">
                        <ShieldCheck className="h-4 w-4" /> Verified
                    </Badge>
                )}
            </div>
            <div className='mt-2'>
                <Markdown content={user.bio || ''} />
            </div>
            <div className='mt-4 flex flex-wrap gap-2'>
              {user.interests?.map(interest => (
                <Badge key={interest.id} variant='secondary'>
                  {interest.display}
                </Badge>
              ))}
            </div>
          </div>
          {isCurrentUserProfile && (
            <div className='flex gap-2'>
              <Link href='/settings'>
                <Button variant='outline'>
                  <Pencil className='mr-2 h-4 w-4' /> Edit Profile
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className='p-6'>
          <Tabs defaultValue='portfolio' className='w-full'>
            <TabsList>
              <TabsTrigger value='portfolio'>Contribution Portfolio</TabsTrigger>
              <TabsTrigger value='badges'>Badges & Certificates</TabsTrigger>
              {user.steemUsername && (
                <TabsTrigger value='steem'>Steem</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value='portfolio' className='mt-6'>
              {userProjects.length > 0 ? (
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                  {userProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      allLearningPaths={allLearningPaths} 
                      allProjectPathLinks={allProjectPathLinks} 
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              ) : (
                <Card className='flex flex-col items-center justify-center text-center p-8 border-dashed mt-6'>
                  <CardHeader>
                    <CardTitle>Let's Get Started!</CardTitle>
                    <CardDescription>This portfolio is ready to be filled with amazing projects.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href='/'>
                      <Button size='lg'>
                        <Rocket className='mr-2 h-5 w-5' />
                        Find the first contribution
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value='badges' className='mt-6'>
              <div className='flex flex-wrap gap-4'>
                {badges.map((badge, index) => {
                  const hasEarned = badge.isEarned(userProjects, user.id);
                  return (
                    <Card
                      key={index}
                      className={cn(
                        'p-4 flex flex-col items-center justify-center gap-2 w-36 h-36 relative',
                        !hasEarned ? 'bg-muted/50 text-muted-foreground' : 'bg-accent/50'
                      )}
                    >
                      {!hasEarned && (
                        <div className='absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg'>
                          <Lock className='h-8 w-8 text-muted-foreground' />
                        </div>
                      )}
                      <badge.icon className={cn('h-8 w-8', hasEarned && 'text-primary')} />
                      <span className='text-sm font-medium text-center'>
                        {badge.name}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
            {user.steemUsername && (
              <TabsContent value='steem' className='mt-6'>
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="blog">Blog</TabsTrigger>
                  </TabsList>
                  <TabsContent value="profile" className="mt-6">
                    {isLoadingSteem ? (
                      <p>Steem profile is loading...</p>
                    ) : steemError ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-destructive">Error Loading Profile</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p>Could not load the Steem profile for @{user.steemUsername}.</p>
                          <p className="text-muted-foreground mt-2">Reason: {steemError}</p>
                        </CardContent>
                      </Card>
                    ) : steemUser ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>Steem Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src={`https://steemitimages.com/u/${steemUser.name}/avatar`} />
                              <AvatarFallback>{steemUser.name[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://steemit.com/@${steemUser.name}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xl font-bold text-primary hover:underline"
                                >
                                  @{steemUser.name}
                                  <span className="text-lg font-normal text-muted-foreground ml-2">
                                    {formatReputation(steemUser.reputation)}
                                  </span>
                                </a>
                                {user.steemVerified && (
                                  <Badge variant="outline" className="text-green-500 bg-green-500/10 border-green-500/20 gap-1 px-1.5 py-0 h-5">
                                    <ShieldCheck className="h-3 w-3" /> Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">{steemUser.post_count} posts</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold">About</h3>
                            <p>{steemProfile?.about || 'No bio provided on Steem.'}</p>
                          </div>
                          {steemProfile?.website && (
                            <div>
                              <h3 className="font-semibold">Website</h3>
                              <a href={steemProfile.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                                <Link2 className="mr-2 h-4 w-4" />
                                {steemProfile.website}
                              </a>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="font-bold text-lg">{formatVotingPower(steemUser.voting_power)}</p>
                              <p className="text-muted-foreground">Voting Power</p>
                            </div>
                            <div>
                              <p className="font-bold text-lg">{steemUser.balance}</p>
                              <p className="text-muted-foreground">Steem</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <p>No Steem profile found for this user.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="blog" className="mt-6">
                    {isLoadingPosts ? (
                      <p>Steem posts are loading...</p>
                    ) : postsError ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-destructive">Sync Warning</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p>Could not sync the latest Steem posts. The displayed posts are from the last successful sync.</p>
                          <p className="text-muted-foreground mt-2">Reason: {postsError}</p>
                        </CardContent>
                      </Card>
                    ) : steemPosts && steemPosts.length > 0 ? (
                      <div className="space-y-6">
                        {steemPosts.map(post => (
                          <Card key={post.post_id}>
                            <CardHeader>
                              <CardTitle className="text-lg">
                                <a href={`https://steemit.com${post.url}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  {post.title}
                                </a>
                              </CardTitle>
                              <CardDescription>
                                Published on {new Date(post.created).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                               <div className="text-muted-foreground line-clamp-3">
                                <Markdown content={post.body} />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p>No posts found for this user on Steem.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
