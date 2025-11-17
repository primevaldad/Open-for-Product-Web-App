'use client';

import { useEffect, useState } from 'react';
import { Award, Lock, Pencil, Rocket } from 'lucide-react';
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
            // Even with an error (e.g., API down), we might get cached posts.
            // The error message will inform the user.
            setPostsError(response.error);
          }
           else {
            setPostsError(null);
          }
          // Always set posts, as we might have cached data even if there's an error.
          setSteemPosts(response.posts);
        })
        .catch(error => {
          console.error('Unexpected error calling syncSteemPostsAction:', error);
          setPostsError('An unexpected client-side error occurred.');
          setSteemPosts(null); // In case of a critical client-side failure
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
    if (!steemUser?.json_metadata) {
      return null;
    }
    try {
      return JSON.parse(steemUser.json_metadata).profile;
    } catch (e) {
      console.error('Failed to parse Steem json_metadata:', e);
      return null;
    }
  })();

  return (
    <div className='flex h-full min-h-screen w-full bg-background'>
      <main className='flex-1 overflow-auto'>
        <div className='relative h-48 w-full bg-primary/10'>
          <div className='absolute -bottom-16 left-6'>
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
          </div>
        </div>
        <div className='p-6 pt-20 flex justify-between items-start'>
          <div>
            <h1 className='text-3xl font-bold'>{user.name}</h1>
            <p className='text-muted-foreground max-w-xl'>{user.bio}</p>
            <div className='mt-4 flex flex-wrap gap-2'>
              {user.interests?.map(interest => (
                <Badge key={interest} variant='secondary'>
                  {interest}
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
                              <p className="text-muted-foreground">{steemUser.post_count} posts</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold">About</h3>
                            <p>{steemProfile?.about || 'No bio provided on Steem.'}</p>
                          </div>
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
                              <p className="text-muted-foreground line-clamp-3">
                                {post.body}
                              </p>
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
