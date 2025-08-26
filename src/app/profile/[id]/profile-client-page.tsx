
'use client';

import { Award, Lock, Pencil, Rocket } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { User, Project } from '@/lib/types';

const badges = [
  { name: 'First Contribution', icon: Award },
  { name: 'Community Helper', icon: Award },
  { name: 'Project Starter', icon: Award },
  { name: 'Bug Squasher', icon: Award },
  { name: 'Creative Spark', icon: Award },
];

interface UserProfileClientPageProps {
  user: User;
  userProjects: Project[];
  isCurrentUserProfile: boolean;
}

export default function UserProfilePageClient({ user, userProjects, isCurrentUserProfile }: UserProfileClientPageProps) {
  const hasContributed = userProjects.length > 0;

  return (
    <div className="flex h-full min-h-screen w-full bg-background">
      <main className="flex-1 overflow-auto">
        <div className="relative h-48 w-full bg-primary/10">
          <div className="absolute -bottom-16 left-6">
            <Avatar className="h-32 w-32 rounded-full border-4 border-background">
              <AvatarImage
                src={user.avatarUrl}
                alt={user.name}
                data-ai-hint="person portrait"
              />
              <AvatarFallback className="text-4xl">
                {user.name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="p-6 pt-20 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground max-w-xl">{user.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.interests?.map(interest => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
          {isCurrentUserProfile && (
            <div className="flex gap-2">
              <Link href="/settings">
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="p-6">
          <Separator className="my-6" />

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Badges & Certificates
            </h2>
            <div className="flex flex-wrap gap-4">
              {badges.map((badge, index) => {
                const isFirstBadge = badge.name === 'First Contribution';
                const isLocked = isFirstBadge && !hasContributed;

                return (
                  <Card
                    key={index}
                    className={cn(
                      'p-4 flex flex-col items-center justify-center gap-2 w-36 h-36 relative',
                      isLocked ? 'bg-muted/50 text-muted-foreground' : 'bg-accent/50'
                    )}
                  >
                    {isLocked && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <Lock className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <badge.icon className={cn('h-8 w-8', !isLocked && 'text-primary')} />
                    <span className="text-sm font-medium text-center">
                      {badge.name}
                    </span>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Contribution Portfolio
            </h2>
            {hasContributed ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center text-center p-8 border-dashed">
                <CardHeader>
                  <CardTitle>Let's Get Started!</CardTitle>
                  <CardDescription>Your portfolio is ready to be filled with amazing projects.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/">
                    <Button size="lg">
                      <Rocket className="mr-2 h-5 w-5" />
                      Find your first contribution
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

    