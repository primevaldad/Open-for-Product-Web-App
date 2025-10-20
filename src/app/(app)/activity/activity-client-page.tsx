
'use client';

import { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import TaskCard from '@/components/task-card';
import EditTaskDialog from '@/components/edit-task-dialog';
import { HydratedTask, ActivityClientPageProps } from './utils'; // Import the specific hydrated type
import type { ServerActionResponse, Task } from '@/lib/types';
import { toDate } from '@/lib/utils';
import { toast } from 'sonner';

export function ActivityClientPage(props: ActivityClientPageProps) {
    const { myTasks, createdTasks, projects, users, updateTask, deleteTask } = props;

    const [selectedTask, setSelectedTask] = useState<HydratedTask | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleEditClick = (task: HydratedTask) => {
        setSelectedTask(task);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = async (task: HydratedTask) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            const result = await deleteTask({ id: task.id, projectId: task.projectId! });
            if (result.success) {
                toast.success('Task deleted successfully!');
            } else {
                toast.error(`Failed to delete task: ${result.error}`);
            }
        }
    };

    const handleDialogClose = () => {
        setIsEditDialogOpen(false);
        setSelectedTask(null);
    };

    const handleUpdateTask = async (updatedValues: Task) => {
        const result = await updateTask(updatedValues);
        if (result.success) {
            toast.success('Task updated successfully!');
            handleDialogClose();
        } else {
            toast.error(`Failed to update task: ${result.error}`);
        }
    };

    const getProjectTeam = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return [];
        const usersMap = new Map(users.map(u => [u.id, u]));
        
        return project.team
            .map(member => {
                const user = usersMap.get(member.userId);
                return user ? { ...member, user, userId: user.id } : null;
            })
            .filter(Boolean);
    };

    const parseTasks = (tasks: HydratedTask[]): HydratedTask[] => tasks.map(task => ({
        ...task,
        createdAt: toDate(task.createdAt as string),
        updatedAt: toDate(task.updatedAt as string),
    }));

    return (
        <div className="container mx-auto p-4">
            <Tabs>
                <TabList>
                    <Tab>My Tasks ({myTasks.length})</Tab>
                    <Tab>Created by Me ({createdTasks.length})</Tab>
                </TabList>

                <TabPanel>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {parseTasks(myTasks).map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onEdit={() => handleEditClick(task)} 
                                onDelete={() => handleDeleteClick(task)} 
                            />
                        ))}
                    </div>
                </TabPanel>
                <TabPanel>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {parseTasks(createdTasks).map(task => (
                            <TaskCard 
                                key={task.id} 
                                task={task} 
                                onEdit={() => handleEditClick(task)} 
                                onDelete={() => handleDeleteClick(task)} 
                            />
                        ))}
                    </div>
                </TabPanel>
            </Tabs>

            {selectedTask && (
                <EditTaskDialog
                    isOpen={isEditDialogOpen}
                    onClose={handleDialogClose}
                    task={selectedTask}
                    projectTeam={getProjectTeam(selectedTask.projectId!)}
                    onUpdate={handleUpdateTask}
                />
            )}
        </div>
    );
}
