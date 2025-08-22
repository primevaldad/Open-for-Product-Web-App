import Link from 'next/link';
import { ArrowUpRight, CheckCircle, MessageSquare, Sparkles, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { projectCategories } from '@/lib/data';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  className?: string;
}

export default function ProjectCard({ project, className }: ProjectCardProps) {
  const CategoryIcon =
    projectCategories.find((c) => c.name === project.category)?.icon ?? Users;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1", className)}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="mb-2">
              <CategoryIcon className="mr-1 h-3 w-3" />
              {project.category}
            </Badge>
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
                <TooltipContent>
                  <p>Expert Reviewed</p>
                </TooltipContent>
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
      <CardFooter className="flex items-center justify-between bg-muted/50 p-4">
        <div className="flex -space-x-2">
          {project.team.map((member, index) => (
            <TooltipProvider key={member.id}>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{member.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
                <Users className="h-4 w-4" /> {project.votes}
            </span>
            <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" /> {project.discussions}
            </span>
        </div>
      </CardFooter>
    </Card>
  );
}
