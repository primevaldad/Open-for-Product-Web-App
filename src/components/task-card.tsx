'use client';

import type { Task, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, Edit, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskCardProps {
  task: Task;
  assignee?: User;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, assignee, onEdit, onDelete }: TaskCardProps) {
  const { title, description, dueDate, estimatedHours, isMilestone, id } = task;

  const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('');

  return (
    <Card className="mb-4 break-inside-avoid shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold pr-2">{title}</CardTitle>
          {isMilestone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Milestone Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{description}</p>}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            {dueDate && <span>Due: {new Date(dueDate).toLocaleDateString()}</span>}
            {estimatedHours != null && <span>{estimatedHours} hrs</span>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center">
            {assignee ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{assignee.name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <div className="text-xs text-gray-500">Unassigned</div>
            )}
        </div>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit Task</TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Task</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}
