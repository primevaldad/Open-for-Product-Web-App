'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';

import type { User, HydratedProject, Task, Discussion, LearningPath, HydratedDiscussion, ProjectCollection } from '@/lib/types';
import { type TaskFormValues } from '@/lib/schemas';
import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';
import { useAuth } from '@/components/auth-provider';
import { Layers, Plus, Check, ChevronDown, Loader2 } from 'lucide-react';

import {
    joinProject as joinProjectAction,
    leaveProject as leaveProjectAction,
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
import {
    getMyCollections,
    addProjectToCollectionAction,
    removeProjectFromCollectionAction,
} from '@/app/actions/collections';
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

// ---------------------------------------------------------------------------
// Add to Collection button
// ---------------------------------------------------------------------------

function AddToCollectionButton({
    projectId,
    isGuest,
}: {
    projectId: string;
    isGuest: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [collections, setCollections] = useState<ProjectCollection[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [added, setAdded] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const loadCollections = useCallback(async () => {
        setLoading(true);
        const result = await getMyCollections();
        if (result.success && result.data) {
            setCollections(result.data);
            // Pre-mark collections that already contain this project
            const alreadyIn = new Set(
                result.data
                    .filter(c => c.memberProjectIds.includes(projectId))
                    .map(c => c.id)
            );
            setAdded(alreadyIn);
        }
        setLoading(false);
    }, [projectId]);

    const toggle = async (collectionId: string) => {
        setSaving(collectionId);
        const isAdded = added.has(collectionId);
        const action = isAdded
            ? removeProjectFromCollectionAction(collectionId, projectId)
            : addProjectToCollectionAction(collectionId, projectId);
        const result = await action;
        if (result.success) {
            setAdded(prev => {
                const next = new Set(prev);
                isAdded ? next.delete(collectionId) : next.add(collectionId);
                return next;
            });
            toast({ title: isAdded ? 'Removed from collection' : 'Added to collection' });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setSaving(null);
    };

    if (isGuest) return null;

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                    if (!open) loadCollections();
                    setOpen(o => !o);
                }}
            >
                <Layers className="w-3.5 h-3.5" />
                Add to Collection
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>

            {open && (
                <div className="absolute right-0 mt-1 w-64 z-50 rounded-lg border bg-popover shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            You don&apos;t have any collections yet.
                        </div>
                    ) : (
                        <ul className="py-1">
                            {collections.map(c => (
                                <li key={c.id}>
                                    <button
                                        onClick={() => toggle(c.id)}
                                        disabled={saving === c.id}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                                    >
                                        {saving === c.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                        ) : added.has(c.id) ? (
                                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                        ) : (
                                            <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        )}
                                        <span className="truncate">{c.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="border-t px-3 py-2">
                        <a
                            href="/collections/new"
                            className="text-xs text-primary hover:underline"
                        >
                            + New Collection
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProjectDetailClientPage({
    project: initialProject,
    tasks: initialTasks,
    discussions: initialDiscussions,
    learningPaths: initialLearningPaths,
    users: allUsers,
    currentUser: serverUser,
}: ProjectDetailClientPageProps) {
    const { currentUser: clientUser } = useAuth();
    const currentUser = clientUser || serverUser;
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
                    discussion.replies.sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());
                }
            }

            nested.sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());

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

    const handleLeaveProject = async () => {
        if (!window.confirm('Are you sure you want to leave this project?')) return;
        const result = await leaveProjectAction(project.id);
        handleServerResponse(result, 'Successfully left the project.', 'Failed to leave the project.');
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

    const GuestOverlay = () => {
        // use usePathname or window.location.pathname
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-2">Login to View Project Details</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
                    To see the full project description, task board, and participate in discussions, please join the Open for Product community.
                </p>
                <div className="flex gap-4">
                    <Button onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`)}>
                        Log In
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/signup?redirectTo=${encodeURIComponent(window.location.pathname)}`)}>
                        Sign Up
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <ProjectHeader project={project} currentUser={currentUser} onJoin={handleJoinProject} onLeave={handleLeaveProject} />

            {/* Add to Collection — shown below the header for non-guests */}
            {!isGuest && (
                <div className="mt-3 flex justify-end">
                    <AddToCollectionButton projectId={project.id} isGuest={isGuest} />
                </div>
            )}

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
                        <div className="prose dark:prose-invert max-w-none p-4 relative">
                            <div className={isGuest ? "blur-md pointer-events-none select-none" : ""}>
                                <Markdown content={project.description} />
                            </div>
                            {isGuest && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/30 dark:bg-black/30">
                                    <GuestOverlay />
                                </div>
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
                        ) : (
                            <div className="relative h-64 flex items-center justify-center">
                                <div className="absolute inset-0 blur-sm pointer-events-none opacity-50">
                                    <TaskBoard tasks={tasks.slice(0, 2)} users={users} onEditTask={() => {}} onDeleteTask={() => {}} />
                                </div>
                                <GuestOverlay />
                            </div>
                        )}
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
                         ) : (
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 blur-md pointer-events-none opacity-50">
                                    {/* Dummy discussions for visual effect */}
                                    <p className="p-4">Sample discussion content...</p>
                                    <p className="p-4">Sample discussion reply...</p>
                                </div>
                                <div className="py-12 w-full flex justify-center">
                                    <GuestOverlay />
                                </div>
                            </div>
                         )}
                    </TabPanel>
                    <TabPanel>
                        {currentUser ? (
                            <ProjectTeam 
                                projectId={project.id}
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
