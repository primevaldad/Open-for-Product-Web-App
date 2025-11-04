'use client';

import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task } from '@/lib/types';

interface TaskBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskCard = ({ task, onEditTask, onDeleteTask }: { task: Task, onEditTask: (task: Task) => void, onDeleteTask: (taskId: string) => void }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div role="button" tabIndex={0} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEditTask(task)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteTask(task.id)} className="text-red-500">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{task.description}</p>
    {task.assignedToId && (
        <div className="text-xs text-gray-500 dark:text-gray-400">Assigned to: {task.assignedToId}</div>
    )}
  </div>
);

const TaskColumn = ({ title, tasks, onEditTask, onDeleteTask }: { title: string, tasks: Task[], onEditTask: (task: Task) => void, onDeleteTask: (taskId: string) => void }) => (
  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 flex-1">
    <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      ))}
    </div>
  </div>
);

export default function TaskBoard({ tasks, onEditTask, onDeleteTask }: TaskBoardProps) {
  const columns = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'To Do'),
      inProgress: tasks.filter(t => t.status === 'In Progress'),
      done: tasks.filter(t => t.status === 'Done'),
    };
  }, [tasks]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <TaskColumn title="To Do" tasks={columns.todo} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      <TaskColumn title="In Progress" tasks={columns.inProgress} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      <TaskColumn title="Done" tasks={columns.done} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
    </div>
  );
}
