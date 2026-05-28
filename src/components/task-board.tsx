'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Task, User } from '@/lib/types';
import TaskCard from '@/components/task-card';

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: Task['status'], newSortOrder: number) => void;
  syncingTasks?: Set<string>;
}

const TaskColumn = ({ title, status, tasks, users, onEditTask, onDeleteTask, syncingTasks }: { title: string, status: string, tasks: Task[], users: User[], onEditTask: (task: Task) => void, onDeleteTask: (taskId: string) => void, syncingTasks?: Set<string> }) => {
  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'Column', status } });

  return (
      <div 
        ref={setNodeRef}
        className={`bg-gray-100 dark:bg-gray-900 rounded-lg p-4 flex-1 flex flex-col min-h-[500px] transition-colors ${isOver ? 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
      >
        <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-gray-200 mb-4 flex justify-between items-center">
          {title}
          <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500 font-medium">{tasks.length}</span>
        </h3>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 flex flex-col gap-0 min-h-[100px]">
            {tasks.map(task => {
              const assignee = task.assignedToId ? usersMap.get(task.assignedToId) : undefined;
              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  assignee={assignee} 
                  onEdit={onEditTask} 
                  onDelete={onDeleteTask} 
                  isSyncing={syncingTasks?.has(task.id)}
                />
              )
            })}
          </div>
        </SortableContext>
      </div>
  );
};

export default function TaskBoard({ tasks: initialTasks, users, onEditTask, onDeleteTask, onMoveTask, syncingTasks }: TaskBoardProps) {
  // Local optimistic state
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Sync with upstream when it updates
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // allows clicks on buttons to work without triggering drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure tasks are strictly sorted
  const sortedTasks = useMemo(() => {
      return [...tasks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [tasks]);

  const columns = useMemo(() => {
    return {
      'To Do': sortedTasks.filter(t => t.status === 'To Do'),
      'In Progress': sortedTasks.filter(t => t.status === 'In Progress'),
      'Done': sortedTasks.filter(t => t.status === 'Done'),
    };
  }, [sortedTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    setTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        if (activeIndex === -1) return prev;
        
        const activeTask = prev[activeIndex];
        let newStatus = activeTask.status;

        if (isOverTask) {
            const overTask = prev.find(t => t.id === overId);
            if (overTask && overTask.status !== activeTask.status) {
                newStatus = overTask.status;
            }
        } else if (isOverColumn) {
            newStatus = overId as Task['status'];
        }

        if (newStatus !== activeTask.status) {
            const newTasks = [...prev];
            newTasks[activeIndex] = { ...activeTask, status: newStatus };
            return newTasks;
        }

        return prev;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = tasks.findIndex(t => t.id === activeId);
    if (activeIndex === -1) return;
    const activeTask = tasks[activeIndex];

    let newStatus = activeTask.status;
    const isOverColumn = over.data.current?.type === 'Column';
    
    if (isOverColumn) {
        newStatus = overId as Task['status'];
    } else {
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) {
            newStatus = overTask.status;
        }
    }

    // Calculate new float-based sort order
    let newSortOrder = activeTask.sortOrder || 0;
    
    // Get the array of tasks currently in the target column
    let colTasks = tasks.filter(t => t.status === newStatus).sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));

    if (activeId !== overId && !isOverColumn) {
        const overIndex = colTasks.findIndex(t => t.id === overId);
        const oldIndex = colTasks.findIndex(t => t.id === activeId);
        
        if (overIndex !== -1) {
            // Reorder within the column using dnd-kit's arrayMove
            let reordered = colTasks;
            if (oldIndex !== -1) {
                reordered = arrayMove(colTasks, oldIndex, overIndex);
            } else {
                reordered.splice(overIndex, 0, activeTask);
            }

            const targetPos = reordered.findIndex(t => t.id === activeId);
            const prevTask = targetPos > 0 ? reordered[targetPos - 1] : null;
            const nextTask = targetPos < reordered.length - 1 ? reordered[targetPos + 1] : null;

            if (prevTask && nextTask) {
                newSortOrder = ((prevTask.sortOrder || 0) + (nextTask.sortOrder || 0)) / 2.0;
            } else if (prevTask) {
                newSortOrder = (prevTask.sortOrder || 0) + 1000;
            } else if (nextTask) {
                newSortOrder = (nextTask.sortOrder || 0) - 1000;
            }
        }
    } else if (isOverColumn && activeId !== overId) {
        // Appended to empty column or end
        const otherTasks = colTasks.filter(t => t.id !== activeId);
        if (otherTasks.length > 0) {
            newSortOrder = (otherTasks[otherTasks.length - 1].sortOrder || 0) + 1000;
        } else {
            newSortOrder = 1000;
        }
    }

    // Check if anything actually changed relative to INITIAL tasks
    const originalTask = initialTasks.find(t => t.id === activeId);
    
    if (originalTask && (originalTask.status !== newStatus || Math.abs((originalTask.sortOrder || 0) - newSortOrder) > 0.001)) {
        // Optimistic final state
        const finalTask = { ...activeTask, status: newStatus, sortOrder: newSortOrder };
        setTasks(prev => prev.map(t => t.id === activeId ? finalTask : t));

        // Fire callback for server sync
        onMoveTask?.(activeId, newStatus, newSortOrder);
    } else {
        // Reset if no significant change
        setTasks(initialTasks);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeAssignee = activeTask?.assignedToId ? users.find(u => u.id === activeTask.assignedToId) : undefined;

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.4',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <TaskColumn title="To Do" status="To Do" tasks={columns['To Do']} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} syncingTasks={syncingTasks} />
        <TaskColumn title="In Progress" status="In Progress" tasks={columns['In Progress']} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} syncingTasks={syncingTasks} />
        <TaskColumn title="Done" status="Done" tasks={columns['Done']} users={users} onEditTask={onEditTask} onDeleteTask={onDeleteTask} syncingTasks={syncingTasks} />
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
            <div className="opacity-90 rotate-2 scale-105 pointer-events-none drop-shadow-2xl">
                <TaskCard 
                    task={activeTask} 
                    assignee={activeAssignee} 
                    onEdit={() => {}} 
                    onDelete={() => {}} 
                />
            </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
