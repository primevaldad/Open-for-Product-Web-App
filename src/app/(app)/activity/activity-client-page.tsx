
'use client';

import { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { HydratedTask, ActivityClientPageProps } from './utils';
import type { Task, User } from '@/lib/types';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

// We create a new TaskCard component here specifically for the activity page
// to avoid prop-drilling and complexity in the main TaskCard.
const ActivityTaskCard = ({ task, onEdit, onDelete, project, assignee }: { 
    task: HydratedTask, 
    onEdit: () => void, 
    onDelete: () => void,
    project?: { id: string, name: string },
    assignee?: User 
}) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{task.title}</CardTitle>
                    {project && <CardDescription>in project: {project.name}</CardDescription>}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
        <CardContent>
            {task.description && <p className="text-sm text-muted-foreground mb-4">{task.description}</p>}
            <div className="flex items-center justify-between">
                {assignee && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                            <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{assignee.name}</span>
                    </div>
                )}
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.status === 'Done' ? 'bg-green-100 text-green-800' :
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {task.status}
                </span>
            </div>
        </CardContent>
    </Card>
);


export function ActivityClientPage(props: ActivityClientPageProps) {
    const { myTasks, createdTasks, projects, users, deleteTask } = props;

    const [selectedTask, setSelectedTask] = useState<HydratedTask | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    const usersMap = new Map(users.map(u => [u.id, u]));
    const projectsMap = new Map(projects.map(p => [p.id, p]));

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

        return project.team
            .map(member => usersMap.get(member.userId))
            .filter((user): user is User => !!user);
    };

    const renderTaskList = (tasks: HydratedTask[]) => {
        if (tasks.length === 0) {
            return <p className="text-muted-foreground text-center mt-8">No tasks here!</p>
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {tasks.map(task => {
                    const project = task.projectId ? projectsMap.get(task.projectId) : undefined;
                    const assignee = task.assignedToId ? usersMap.get(task.assignedToId) : undefined;
                    return (
                        <ActivityTaskCard 
                            key={task.id} 
                            task={task} 
                            onEdit={() => handleEditClick(task)} 
                            onDelete={() => handleDeleteClick(task)}
                            project={project ? { id: project.id, name: project.name } : undefined}
                            assignee={assignee}
                        />
                    )
                })}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4">
            <Tabs>
                <TabList>
                    <Tab>My Tasks ({myTasks.length})</Tab>
                    <Tab>Created by Me ({createdTasks.length})</Tab>
                </TabList>

                <TabPanel>
                    {renderTaskList(myTasks)}
                </TabPanel>
                <TabPanel>
                    {renderTaskList(createdTasks)}
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
