'use client';

import { useMemo } from 'react';
import type { Task, User } from '@/lib/types';
import TaskCard from '@/components/task-card'; // Import the new component

interface TaskBoardProps {
  tasks: Task[];
  users: User[]; // Add users to props
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskColumn = ({ title, tasks, users, onEditTask, onDeleteTask }: { title: string, tasks: Task[], users: User[], onEditTask: (task: Task) => void, onDeleteTask: (taskId: string) => void }) => {
  
  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  return (
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 flex-1">
        <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
        <div className="columns-1 md:columns-1 gap-4">
          {tasks.map(task => {
            const assignee = task.assignedToId ? usersMap.get(task.assignedToId) : undefined;
            return (
              <TaskCard 
                key={task.id} 
                task={task} 
                assignee={assignee} 
                onEdit={onEditTask} 
                onDelete={onDeleteTask} 
              />
            )
          })}
        </div>
      </div>
  );
};


export default function TaskBoard({ tasks, users, onEditTask, onDeleteTask }: TaskBoardProps) {
  const columns = useMemo(() => {
    return {
      todo: tasks.filter(t => t.status === 'To Do'),
      inProgress: tasks.filter(t => t.status === 'In Progress'),
      done: tasks.filter(t => t.status === 'Done'),
    };
  }, [tasks]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <TaskColumn title="To Do" tasks={columns.todo} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      <TaskColumn title="In Progress" tasks={columns.inProgress} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
      <TaskColumn title="Done" tasks={columns.done} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} />
    </div>
  );
}
