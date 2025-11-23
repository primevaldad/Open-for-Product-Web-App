'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { useToast } from '@/hooks/use-toast';

import type { User, HydratedProject, Task, Discussion, LearningPath, HydratedDiscussion } from '@/lib/types';
import { type TaskFormValues } from '@/lib/schemas';
import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';

import {
    joinProject as joinProjectAction,
    addDiscussionComment as addDiscussionCommentAction,
    addTask as addTaskAction,
    updateTask as updateTaskAction,
    deleteTask as deleteTaskAction,
} from '@/app/actions/projects';
import { 
    applyForRole as applyForRoleAction, 
    approveRoleApplication as approveRoleApplicationAction, 
    denyRoleApplication as denyRoleApplicationAction 
} from '@/app/actions/roles';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';

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

    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setProject(initialProject);
        setTasks(initialTasks);
        setDiscussions(initialDiscussions);
        setLearningPaths(initialLearningPaths);
        setUsers(allUsers);
    }, [initialProject, initialTasks, initialDiscussions, initialLearningPaths, allUsers]);

    const hydratedDiscussions: HydratedDiscussion[] = useMemo(() => {
        const usersMap = new Map(users.map(u => [u.id, u]));

        const nest = (list: Discussion[]): HydratedDiscussion[] => {
            const discussionMap = new Map(list.map(d => [d.id, { ...d, user: usersMap.get(d.userId), replies: [] as HydratedDiscussion[] }]));
            const nested: HydratedDiscussion[] = [];

            for (const discussion of discussionMap.values()) {
                if (discussion.parentId) {
                    const parent = discussionMap.get(discussion.parentId);
                    if (parent) {
                        parent.replies.push(discussion);
                    } else {
                        nested.push(discussion);
                    }
                } else {
                    nested.push(discussion);
                }
            }
            
            for (const discussion of discussionMap.values()) {
                if (discussion.replies.length > 1) {
                    discussion.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                }
            }

            nested.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            return nested;
        };

        return nest(discussions);
    }, [discussions, users]);

    const isMember = useMemo(() => 
        currentUser && project.team.some(member => member.userId === currentUser.id),
        [currentUser, project.team]
    );

    const isLead = useMemo(() => 
        currentUser && project.team.some(member => member.userId === currentUser.id && member.role === 'lead'),
        [currentUser, project.team]
    );

    const isGuest = !currentUser || currentUser.role === 'guest';

    const handleServerResponse = (
        result: { success: boolean, [key: string]: any }, 
        successMessage: string, 
        failureMessage: string
    ) => {
        if (result.success) {
            const description = result.message || successMessage;
            toast({ title: 'Success', description });
            router.refresh(); // Refresh to ensure server-side data is up-to-date
        } else {
            const description = result.error || failureMessage;
            toast({ title: 'Error', description, variant: 'destructive' });
        }
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
        const result = await joinProjectAction(project.id);
        handleServerResponse(result, 'Successfully joined the project!', 'Failed to join the project.');
    };

    const handleApplyForRole = async (userId: string, role: 'lead' | 'contributor' | 'participant') => {
        const result = await applyForRoleAction({ projectId: project.id, userId, role });
        handleServerResponse(result, 'Application submitted!', 'Failed to apply for role.');
    };

    const handleApproveRoleApplication = async (userId: string, role: 'lead' | 'contributor' | 'participant') => {
        const result = await approveRoleApplicationAction({ projectId: project.id, userId, role });
        handleServerResponse(result, 'Application approved!', 'Failed to approve application.');
    };

    const handleDenyRoleApplication = async (userId: string) => {
        const result = await denyRoleApplicationAction({ projectId: project.id, userId });
        handleServerResponse(result, 'Application denied.', 'Failed to deny application.');
    };

    const handleAddTask = async (values: TaskFormValues) => {
        const taskDataForAction: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
            projectId: project.id,
            title: values.title!,
            description: values.description!,
            status: values.status!,
            assignedToId: values.assigneeId,
            estimatedHours: values.estimatedHours,
            dueDate: values.dueDate?.toISOString(),
            isMilestone: values.isMilestone,
        };
        const result = await addTaskAction(taskDataForAction);
        if (result.success && result.data) {
            setTasks(prevTasks => [...prevTasks, result.data]);
            handleServerResponse(result, 'Task added successfully!', 'Failed to add task.');
        } else {
            handleServerResponse(result, '', 'Failed to add task.');
        }
        return result;
    };

    const handleUpdateTask = async (values: TaskFormValues) => {
        if (!editingTask) return;
        const updatedTaskData: Task = {
            ...editingTask,
            ...values,
            dueDate: values.dueDate ? values.dueDate.toISOString() : editingTask.dueDate,
        };
        const result = await updateTaskAction(updatedTaskData);
        if (result.success && result.data) {
            setTasks(tasks.map(t => t.id === result.data.id ? result.data : t));
            handleCloseEditTaskDialog();
            handleServerResponse(result, 'Task updated successfully!', 'Failed to update task.');
        } else {
            handleServerResponse(result, '', 'Failed to update task.');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        const result = await deleteTaskAction({ id: taskId, projectId: project.id });
        if (result.success) {
            setTasks(tasks.filter(t => t.id !== taskId));
            handleServerResponse(result, 'Task deleted successfully!', 'Failed to delete task.');
        } else {
             handleServerResponse(result, '', 'Failed to delete task.');
        }
    };

    const handleAddComment = async (content: string, parentId?: string) => {
        const result = await addDiscussionCommentAction({ projectId: project.id, content, parentId });

        if (result.success && result.data) {
            setDiscussions(currentDiscussions => [...currentDiscussions, result.data]);
            handleServerResponse(result, 'Comment added successfully!', 'Failed to add comment.');
        } else {
            handleServerResponse(result, '', 'Failed to add comment.');
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
                        <div className="prose dark:prose-invert max-w-none p-4">
                            {!isGuest ? (
                                <Markdown content={project.description} />
                            ) : (
                                <p>Please log in to view the project description.</p>
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        {!isGuest ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    {isMember && (
                                        <AddTaskDialog projectId={project.id} status="To Do" addTask={handleAddTask}>
                                            <Button>Add Task</Button>
                                        </AddTaskDialog>
                                    )}
                                </div>
                                <TaskBoard tasks={tasks} users={users} onEditTask={handleOpenEditTaskDialog} onDeleteTask={handleDeleteTask} />
                            </>
                        ) : <p className="py-4">Login to view project tasks</p>}
                    </TabPanel>
                    <TabPanel>
                         {!isGuest ? (
                            <DiscussionForum 
                                discussions={hydratedDiscussions}
                                onAddComment={handleAddComment}
                                isMember={isMember || false}
                                currentUser={currentUser}
                                users={users}
                            />
                         ) : <p className="py-4">Login to join the discussion</p>}
                    </TabPanel>
                    <TabPanel>
                        {currentUser ? (
                            <ProjectTeam 
                                team={project.team}
                                users={users}
                                currentUser={currentUser}
                                addTeamMember={() => {}} // Placeholder
                                isLead={isLead || false}
                                applyForRole={handleApplyForRole}
                                approveRoleApplication={handleApproveRoleApplication}
                                denyRoleApplication={handleDenyRoleApplication}
                            />
                            ) : <p className="py-4">Login to see the project team</p>}
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
                            ) : <p>No recommended learning paths for this project yet.</p>}
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

            {editingTask && (
                <EditTaskDialog 
                    isOpen={isEditTaskDialogOpen} 
                    onClose={handleCloseEditTaskDialog} 
                    onSave={handleUpdateTask} 
                    task={editingTask} 
                    teamMembers={users} 
                />
            )}
        </div>
    );
}
