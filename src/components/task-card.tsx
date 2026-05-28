'use client';

import type { Task, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, Edit, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Markdown from '@/components/ui/markdown';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  assignee?: User;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isSyncing?: boolean;
}

export default function TaskCard({ task, assignee, onEdit, onDelete, isSyncing }: TaskCardProps) {
  const { title, description, dueDate, estimatedHours, isMilestone, id } = task;

  const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative touch-none">
      <Card className={`mb-4 break-inside-avoid shadow-md hover:shadow-lg transition-shadow duration-200 ${isDragging ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div 
                {...attributes} 
                {...listeners}
                className="cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Drag task"
              >
                <GripVertical className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-bold truncate">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSyncing && (
                <div className="flex items-center text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium tracking-wide">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Syncing...
                </div>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          {description && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 prose-sm line-clamp-3">
              <Markdown content={description} />
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              {dueDate && <span>Due: {new Date(typeof dueDate === 'string' ? dueDate : (dueDate as any).toDate?.() ?? dueDate).toLocaleDateString()}</span>}
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
                  <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Unassigned</div>
              )}
          </div>
          <div className="flex gap-1">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)}>
                              <Edit className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Task</TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30" onClick={() => onDelete(id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Task</TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
