
'use client';

import {
  Award,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { currentUser, projects, users } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ProjectCard from '@/components/project-card';
import { Separator } from '@/components/ui/separator';

const badges = [
  { name: 'First Contribution', icon: Award },
  { name: 'Community Helper', icon: Award },
  { name: 'Project Starter', icon: Award },
  { name: 'Bug Squasher', icon: Award },
  { name: 'Creative Spark', icon: Award },
];

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const user = users.find(u => u.id === userId);
  const isCurrentUser = currentUser.id === user?.id;

  if (!user) {
    notFound();
  }

  const userProjects = projects.filter(
    p =>
      p.status === 'published' && p.team.some(member => member.user.id === user.id)
  );

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
          </div>
          {isCurrentUser && (
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
              {badges.map((badge, index) => (
                <Card
                  key={index}
                  className="p-4 flex flex-col items-center justify-center gap-2 w-36 h-36 bg-accent/50"
                >
                  <badge.icon className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium text-center">
                    {badge.name}
                  </span>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Contribution Portfolio
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
