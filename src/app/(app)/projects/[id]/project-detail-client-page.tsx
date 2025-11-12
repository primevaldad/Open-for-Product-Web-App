'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { useToast } from '@/hooks/use-toast';

import type { User, HydratedProject, Task, Discussion, LearningPath } from '@/lib/types';
import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import { Button } from '@/components/ui/button';

import { joinProject as joinProjectAction, addDiscussionComment as addDiscussionAction } from '@/app/actions/projects';
import { applyForRole as applyForRoleAction, approveRoleApplication as approveRoleApplicationAction, denyRoleApplication as denyRoleApplicationAction } from '@/app/actions/roles';
import { updateTaskInDb as updateTaskAction, deleteTaskFromDb as deleteTaskAction } from '@/lib/data.server';
import { EditTaskDialog } from "/home/user/studio/src/components/edit-task-dialog"
import { AddTaskDialog } from "/home/user/studio/src/components/add-task-dialog"

interface ProjectDetailClientPageProps {
    project: HydratedProject;
    tasks: Task[];
    discussions: Discussion[];
    learningPaths: LearningPath[];
    users: User[];
    currentUser: User | null;
}

export default function ProjectDetailClientPage({
    project: initialProject,
    tasks: initialTasks,
    discussions: initialDiscussions,
    learningPaths: initialLearningPaths,
    users: allUsers,
    currentUser,
}: ProjectDetailClientPageProps) {
    const [project, setProject] = useState(initialProject);
    const [tasks, setTasks] = useState(initialTasks);
    const [discussions, setDiscussions] = useState(initialDiscussions);
    const [learningPaths, setLearningPaths] = useState(initialLearningPaths);
    const [users, setUsers] = useState(allUsers);
    const [tabIndex, setTabIndex] = useState(0);
    const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const router = useRouter();
    const currentPath = usePathname();
    const { toast } = useToast();

    useEffect(() => {
        setProject(initialProject);
        setTasks(initialTasks);
        setDiscussions(initialDiscussions);
        setLearningPaths(initialLearningPaths);
        setUsers(allUsers);
    }, [initialProject, initialTasks, initialDiscussions, initialLearningPaths, allUsers]);

    const isMember = useMemo(() => 
        currentUser && project.team.some(member => member.userId === currentUser.id),
        [currentUser, project.team]
    );

    const isLead = useMemo(() => 
        currentUser && project.team.some(member => member.userId === currentUser.id && member.role === 'lead'),
        [currentUser, project.team]
    );

    const isGuest = !currentUser || currentUser.role === 'guest';

    const handleOpenAddTaskDialog = () => {
        setIsAddTaskDialogOpen(true);
    };

    const handleCloseAddTaskDialog = () => {
        setIsAddTaskDialogOpen(false);
    };

    const handleOpenEditTaskDialog = (task: Task) => {
        setEditingTask(task);
        setIsEditTaskDialogOpen(true);
    };

    const handleCloseEditTaskDialog = () => {
        setIsEditTaskDialogOpen(false);
        setEditingTask(null);
    };

    const handleJoinProject = async () => {
        if (!currentUser) {
            toast({ title: 'Error', description: 'You must be logged in to join a project.', variant: 'destructive' });
            return;
        }
        const result = await joinProjectAction({ projectId: project.id, userId: currentUser.id });
        if (result.success) {
            toast({ title: 'Success', description: 'Successfully joined the project!' });
            router.refresh();
        } else {
            toast({ title: 'Error', description: result.error || 'Failed to join the project.', variant: 'destructive' });
        }
    };

    const handleApplyForRole = async (userId: string, role: 'lead' | 'contributor' | 'participant') => {
        const result = await applyForRoleAction({ projectId: project.id, userId, role });
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            router.refresh();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handleApproveRoleApplication = async (userId: string, role: 'lead' | 'contributor' | 'participant') => {
        const result = await approveRoleApplicationAction({ projectId: project.id, userId, role });
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            router.refresh();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handleDenyRoleApplication = async (userId: string) => {
        const result = await denyRoleApplicationAction({ projectId: project.id, userId });
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            router.refresh();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const result = await updateTaskAction({
                projectId: project.id,
                task: editingTask ? { ...editingTask, ...taskData } : taskData,
            });

            if (result.success && result.task) {
                if (editingTask) {
                    setTasks(tasks.map(t => t.id === result.task!.id ? result.task! : t));
                    toast({ title: 'Success', description: 'Task updated successfully!' });
                    handleCloseEditTaskDialog();
                } else {
                    setTasks([...tasks, result.task]);
                    toast({ title: 'Success', description: 'Task added successfully!' });
                    handleCloseAddTaskDialog();
                }
                router.refresh();
            } else {
                toast({ title: 'Error', description: result.error || 'Failed to save task.', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            const result = await deleteTaskAction({ projectId: project.id, taskId });

            if (result.success) {
                setTasks(tasks.filter(t => t.id !== taskId));
                toast({ title: 'Success', description: 'Task deleted successfully!' });
                router.refresh();
            } else {
                toast({ title: 'Error', description: result.error || 'Failed to delete task.', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        }
    };

    const handleAddDiscussion = async (newDiscussion: Omit<Discussion, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const result = await addDiscussionAction({ projectId: project.id, discussion: newDiscussion });
            if (result.success && result.discussion) {
                setDiscussions([result.discussion, ...discussions]);
                toast({ title: 'Success', description: 'Discussion started successfully!' });
                router.refresh();
            } else {
                toast({ title: 'Error', description: result.error || 'Failed to start discussion.', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <ProjectHeader project={project} currentUser={currentUser} onJoin={handleJoinProject} />
            
            <div className="mt-8">
                <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
                    <TabList>
                        <Tab>About</Tab>
                        <Tab>Tasks</Tab>
                        <Tab>Discussion</Tab>
                        <Tab>Team</Tab>
                        <Tab>Learning Paths</Tab>
                        <Tab>Governance</Tab>
                    </TabList>

                    <TabPanel>
                        <p>{project.description}</p>
                    </TabPanel>
                    <TabPanel>
                        {currentUser && !isGuest ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    {isMember && <Button onClick={handleOpenAddTaskDialog}>Add Task</Button>}
                                </div>
                                <TaskBoard 
                                    tasks={tasks} 
                                    onEditTask={handleOpenEditTaskDialog}
                                    onDeleteTask={handleDeleteTask}
                                />
                            </>
                        ) : (
                            <div className="py-4 relative h-60">
                                <p>Login to view project tasks</p>
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                         {currentUser && !isGuest ? (
                            <DiscussionForum 
                                discussions={discussions}
                                onAddComment={handleAddDiscussion}
                                currentUser={currentUser}
                            />
                         ) : (
                            <div className="py-4 relative h-60">
                                <p>Login to join the discussion</p>
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                        {currentUser ? (
                            <ProjectTeam 
                                team={project.team}
                                users={users}
                                currentUser={currentUser}
                                addTeamMember={() => {}} // This is a placeholder, as member addition is now through roles
                                isLead={isLead}
                                applyForRole={handleApplyForRole}
                                approveRoleApplication={handleApproveRoleApplication}
                                denyRoleApplication={handleDenyRoleApplication}
                            />
                            ) : (
                                <div className="py-4 relative h-60">
                                    <p>Login to see the project team</p>
                                </div>
                            )}
                    </TabPanel>
                    <TabPanel>
                        <div className="p-4">
                            <h2 className="text-xl font-bold mb-4">Recommended Learning Paths</h2>
                            {learningPaths.length > 0 ? (
                                <ul className="space-y-4">
                                    {learningPaths.map(path => (
                                        <li key={path.pathId} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow">
                                            <h3 className="font-bold text-lg">{path.title}</h3>
                                            <p className="text-gray-600 dark:text-gray-400">{path.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No recommended learning paths for this project yet.</p>
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="p-4">
                            <h2 className="text-xl font-bold">Governance</h2>
                            <p>Details about project governance and decision-making.</p>
                        </div>
                    </TabPanel>
                </Tabs>
            </div>

            <AddTaskDialog 
                isOpen={isAddTaskDialogOpen} 
                onClose={handleCloseAddTaskDialog} 
                onSave={handleSaveTask} 
                users={users}
            />

            {editingTask && (
                <EditTaskDialog 
                    isOpen={isEditTaskDialogOpen} 
                    onClose={handleCloseEditTaskDialog} 
                    onSave={handleSaveTask} 
                    task={editingTask}
                    users={users}
                />
            )}
        </div>
    );
}
