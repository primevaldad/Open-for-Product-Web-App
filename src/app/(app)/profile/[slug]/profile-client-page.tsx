'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AtSign, Calendar, Edit, Link as LinkIcon, MapPin, UserCheck, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getInitials, timeAgo, toDate } from '@/lib/utils';
import type { User, HydratedProject, LearningPath, ProjectPathLink } from '@/lib/types';
import ProjectCard from '@/components/project-card';

interface ProfileClientPageProps {
  user: User;
  userProjects: HydratedProject[];
  isCurrentUserProfile: boolean;
  allLearningPaths: LearningPath[];
  allProjectPathLinks: ProjectPathLink[];
  currentUser: User | null;
}

export default function ProfileClientPage({
  user,
  userProjects,
  isCurrentUserProfile,
  allLearningPaths,
  allProjectPathLinks,
  currentUser,
}: ProfileClientPageProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  if (!user) {
    notFound();
  }

  const handleFollow = () => setIsFollowing(!isFollowing);

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center p-6">
          <div className="flex items-start">
            <Avatar className="h-24 w-24">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
              <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="ml-6">
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">@{user.username}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {user.location && (
                  <div className="flex items-center"><MapPin className="mr-2 h-4 w-4" /> {user.location}</div>
                )}
                <div className="flex items-center"><Calendar className="mr-2 h-4 w-4" /> Joined {timeAgo(toDate(user.createdAt))}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:ml-auto flex flex-col items-stretch gap-2">
            {isCurrentUserProfile ? (
                <Link href="/settings">
                    <Button><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
                </Link>
            ) : (
              <Button onClick={handleFollow} variant={isFollowing ? 'secondary' : 'default'}>
                {isFollowing ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
            <div className="flex items-center justify-end gap-2 mt-2">
              <TooltipProvider>
                {user.website && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <LinkIcon className="h-5 w-5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent><p>{user.website}</p></TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        {user.bio && (
            <CardContent className='px-6 pb-6'>
                <p className="text-foreground max-w-prose">{user.bio}</p>
            </CardContent>
        )}
      </Card>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects ({userProjects.length})</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
        </TabsList>
        <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {userProjects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        currentUser={currentUser} // Pass the currentUser here
                        allLearningPaths={allLearningPaths}
                        allProjectPathLinks={allProjectPathLinks}
                    />
                ))}
            </div>
        </TabsContent>
        <TabsContent value="learning">{/* Learning content goes here */}</TabsContent>
        <TabsContent value="activity">{/* Activity feed goes here */}</TabsContent>
        <TabsContent value="followers">{/* Followers list goes here */}</TabsContent>
      </Tabs>
    </div>
  );
}
