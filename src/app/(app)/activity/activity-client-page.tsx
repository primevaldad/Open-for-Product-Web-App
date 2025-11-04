'use client';

import { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import TaskCard from '@/components/task-card';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { HydratedTask, ActivityClientPageProps } from './utils';
import type { Task, User } from '@/lib/types';
import { toast } from 'sonner';

export function ActivityClientPage(props: ActivityClientPageProps) {
    const { myTasks, createdTasks, projects, users, deleteTask } = props;

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

    const getProjectTeamUsers = (projectId: string): User[] => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return [];
        const usersMap = new Map(users.map(u => [u.id, u]));

        return project.team
            .map(member => usersMap.get(member.userId))
            .filter((user): user is User => !!user);
    };

    return (
        <div className="container mx-auto p-4">
            <Tabs>
                <TabList>
                    <Tab>My Tasks ({myTasks.length})</Tab>
                    <Tab>Created by Me ({createdTasks.length})</Tab>
                </TabList>

                <TabPanel>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {myTasks.map(task => (
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
                        {createdTasks.map(task => (
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
                    teamMembers={getProjectTeamUsers(selectedTask.projectId!)}
                />
            )}
        </div>
    );
}
