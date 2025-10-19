
'use client';

import { Award, Lock, Pencil, Rocket } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User, Project, LearningPath, ProjectPathLink } from '@/lib/types';

const badges = [
  { name: 'First Contribution', icon: Award, isEarned: (projects: Project[]) => projects.length > 0 },
  { name: 'Community Helper', icon: Award, isEarned: (projects: Project[]) => projects.length > 2 }, // Example criteria
  { name: 'Project Starter', icon: Award, isEarned: (projects: Project[], userId: string) => projects.some(p => p.ownerId === userId) },
  { name: 'Bug Squasher', icon: Award, isEarned: () => false }, // Placeholder
  { name: 'Creative Spark', icon: Award, isEarned: () => false }, // Placeholder
];

interface UserProfileClientPageProps {
  user: User;
  userProjects: Project[];
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}
