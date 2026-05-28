'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';

import type { User, HydratedProject, Task, Discussion, LearningPath, HydratedDiscussion, ProjectCollection, Post } from '@/lib/types';
import { type TaskFormValues } from '@/lib/schemas';
import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import { CreatePostDialog } from '@/components/projects/create-post-dialog';
import { ProjectPostsTab } from '@/components/projects/project-posts-tab';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';
import { useAuth } from '@/components/auth-provider';
import { Layers, Plus, Check, ChevronDown, Loader2, Search, Minus, FolderOpen } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    getCollectionsForCuration,
    addProjectToCollectionAction,
    removeProjectFromCollectionAction,
    getCollectionsContainingProject,
} from '@/app/actions/collections';
import { deletePostAction } from '@/app/actions/post';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { buildHybridUrl } from '@/lib/slug';


interface ProjectDetailClientPageProps {
    project: HydratedProject;
    tasks: Task[];
    discussions: Discussion[];
    posts: Post[];
    learningPaths: LearningPath[];
    users: User[];
    currentUser: User | null;
    childProjects?: HydratedProject[];
    inviteToken?: string;
    initialTab?: string;
}

// ---------------------------------------------------------------------------
// Member of Collections indicator
// ---------------------------------------------------------------------------

function MemberOfIndicator({ 
    projectId, 
    currentUserId,
    onMembershipChanged,
}: { 
    projectId: string; 
    currentUserId: string | null;
    onMembershipChanged?: (targetId: string, type: 'collection' | 'project', isAdded: boolean) => void;
}) {
    const [collections, setCollections] = useState<Array<{ id: string; name: string; slug: string; ownerId: string }>>([]);
    const [parentProject, setParentProject] = useState<{ id: string; name: string } | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const { toast } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        const result = await getCollectionsContainingProject(projectId);
        if (result.success && result.data) {
            setCollections(result.data.collections);
            setParentProject(result.data.parentProject ?? null);
        }
        setLoading(false);
    }, [projectId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRemoveFromCollection = async (collectionId: string) => {
        setRemoving(collectionId);
        const result = await removeProjectFromCollectionAction(collectionId, projectId);
        if (result.success) {
            setCollections(prev => prev.filter(c => c.id !== collectionId));
            toast({ title: 'Removed from collection' });
            onMembershipChanged?.(collectionId, 'collection', false);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setRemoving(null);
    };

    const handleRemoveFromParent = async () => {
        if (!parentProject) return;
        setRemoving('parent');
        const { removeProjectFromProjectAction } = await import('@/app/actions/projects');
        const result = await removeProjectFromProjectAction(parentProject.id, projectId);
        if (result.success) {
            const oldParentId = parentProject.id;
            setParentProject(null);
            toast({ title: 'Removed from parent project' });
            onMembershipChanged?.(oldParentId, 'project', false);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setRemoving(null);
    };

    const totalMemberships = collections.length + (parentProject ? 1 : 0);
    if (totalMemberships === 0 && !loading) return null;

    return (
        <Popover open={open} onOpenChange={val => { if (val) load(); setOpen(val); }}>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Layers className="w-3.5 h-3.5" />
                    {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <span>
                            Member of{' '}
                            <span className="font-medium text-foreground">{totalMemberships}</span>{' '}
                            {totalMemberships === 1 ? 'collection' : 'collections'}
                        </span>
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                <div className="px-3 py-2 border-b">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member of</p>
                </div>
                <ul className="py-1">
                    {parentProject && (
                        <li className="flex items-center gap-2 px-3 py-2 text-sm">
                            <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                            <a href={buildHybridUrl('/projects', parentProject.id, parentProject.name)} className="flex-1 truncate hover:underline">
                                {parentProject.name}
                            </a>
                            <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full shrink-0">Project</span>
                            {currentUserId && (
                                <button
                                    onClick={handleRemoveFromParent}
                                    disabled={removing === 'parent'}
                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove from parent project"
                                >
                                    {removing === 'parent' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </li>
                    )}
                    {collections.map(c => (
                        <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                            <a href={buildHybridUrl('/collections', c.id, c.name)} className="flex-1 truncate hover:underline">{c.name}</a>
                            <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full shrink-0">Collection</span>
                            {currentUserId && c.ownerId === currentUserId && (
                                <button
                                    onClick={() => handleRemoveFromCollection(c.id)}
                                    disabled={removing === c.id}
                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove from collection"
                                >
                                    {removing === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}

// ---------------------------------------------------------------------------
// Add to Collection button
// ---------------------------------------------------------------------------

import { addProjectToProjectAction, removeProjectFromProjectAction, getUserLeadProjectsAction } from '@/app/actions/projects';

type CurationTarget = 
    | { type: 'collection'; id: string; name: string; description?: string; ownerId: string }
    | { type: 'project'; id: string; name: string; description?: string; ownerId: string };

function AddToCollectionButton({
    projectId,
    isGuest,
    initialParentProjectId,
    onMembershipChanged,
}: {
    projectId: string;
    isGuest: boolean;
    initialParentProjectId?: string | null;
    onMembershipChanged?: (targetId: string, type: 'collection' | 'project', isAdded: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const [targets, setTargets] = useState<CurationTarget[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [added, setAdded] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const loadTargets = useCallback(async () => {
        setLoading(true);
        const [colResult, projResult] = await Promise.all([
            getCollectionsForCuration(),
            getUserLeadProjectsAction()
        ]);
        
        const newTargets: CurationTarget[] = [];
        const newAdded = new Set<string>();

        if (colResult.success && colResult.data) {
            colResult.data.forEach(c => {
                newTargets.push({ type: 'collection', id: c.id, name: c.name, description: c.description, ownerId: c.ownerId });
                if (c.memberProjectIds.includes(projectId)) {
                    newAdded.add(c.id);
                }
            });
        }

        if (projResult.success && projResult.data) {
            projResult.data.forEach(p => {
                // Don't show the current project itself
                if (p.id === projectId) return;
                
                newTargets.push({ type: 'project', id: p.id, name: p.name, description: p.description, ownerId: p.owner?.id || '' });
                if (p.id === initialParentProjectId) {
                    newAdded.add(p.id);
                }
            });
        }
        
        setTargets(newTargets);
        setAdded(newAdded);
        setLoading(false);
    }, [projectId, initialParentProjectId]);

    const toggle = async (target: CurationTarget) => {
        setSaving(target.id);
        const isAdded = added.has(target.id);
        
        let action;
        if (target.type === 'collection') {
            action = isAdded
                ? removeProjectFromCollectionAction(target.id, projectId)
                : addProjectToCollectionAction(target.id, projectId);
        } else {
            action = isAdded
                ? removeProjectFromProjectAction(target.id, projectId)
                : addProjectToProjectAction(target.id, projectId);
        }

        const result = await action;
        if (result.success) {
            setAdded(prev => {
                const next = new Set(prev);
                if (isAdded) {
                    next.delete(target.id);
                } else {
                    if (target.type === 'project') {
                        // Remove any other projects from added set
                        targets.forEach(t => {
                            if (t.type === 'project' && t.id !== target.id) {
                                next.delete(t.id);
                            }
                        });
                    }
                    next.add(target.id);
                }
                return next;
            });
            toast({ title: isAdded ? `Removed from ${target.type}` : `Added to ${target.type}` });
            onMembershipChanged?.(target.id, target.type, !isAdded);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setSaving(null);
    };

    if (isGuest) return null;

    return (
        <Popover open={open} onOpenChange={(val) => {
            if (val) loadTargets();
            setOpen(val);
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                >
                    <Layers className="w-3.5 h-3.5" />
                    Add to Collection
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-0" align="end">
                {loading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                ) : targets.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                        You don&apos;t have any collections or projects yet.
                    </div>
                ) : (
                    <>
                        <div className="px-3 pt-3 pb-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search collections & projects..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <ScrollArea className="max-h-72">
                            <ul className="py-1">
                                {targets
                                    .filter(t => {
                                        const query = searchQuery.toLowerCase();
                                        return (
                                            t.name.toLowerCase().includes(query) ||
                                            (t.description?.toLowerCase().includes(query) ?? false)
                                        );
                                    })
                                    .map(t => (
                                        <li key={t.id}>
                                            <button
                                                onClick={() => toggle(t)}
                                                disabled={saving === t.id}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                                            >
                                                {saving === t.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                                ) : added.has(t.id) ? (
                                                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                                ) : (
                                                    <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                )}
                                                <span className="truncate flex-1">{t.name}</span>
                                                <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full shrink-0">
                                                    {t.type === 'project' ? 'Project' : 'Collection'}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                            </ul>
                        </ScrollArea>
                    </>
                )}
                <div className="border-t px-3 py-2 bg-muted/30 flex items-center justify-between">
                    <a
                        href="/collections/new"
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                        <Plus className="w-3 h-3" />
                        New Collection
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function ProjectDetailClientPage({
    project: initialProject,
    tasks: initialTasks,
    discussions: initialDiscussions,
    posts: initialPosts,
    learningPaths: initialLearningPaths,
    users: allUsers,
    currentUser: serverUser,
    childProjects: initialChildProjects = [],
    inviteToken,
    initialTab,
}: ProjectDetailClientPageProps) {
    const { currentUser: clientUser } = useAuth();
    const currentUser = clientUser || serverUser;
    const [project, setProject] = useState(initialProject);
    const [membershipVersion, setMembershipVersion] = useState(0);

    const handleMembershipChanged = useCallback((targetId: string, type: 'collection' | 'project', isAdded: boolean) => {
        setMembershipVersion(v => v + 1);
        if (type === 'project') {
            setProject(prev => ({
                ...prev,
                parentProjectId: isAdded ? targetId : (prev.parentProjectId === targetId ? undefined : prev.parentProjectId)
            }));
        }
    }, []);

    const [tasks, setTasks] = useState(initialTasks);
    const [syncingTasks, setSyncingTasks] = useState<Set<string>>(new Set());
    const [discussions, setDiscussions] = useState(initialDiscussions);
    const [posts, setPosts] = useState(initialPosts);
    const [learningPaths, setLearningPaths] = useState(initialLearningPaths);
    const [users, setUsers] = useState(allUsers);
    const [childProjects, setChildProjects] = useState(initialChildProjects);
    
    // Map initialTab string to tab index
    const initialTabIndex = useMemo(() => {
        if (!initialTab) return 0;
        const map: Record<string, number> = { about: 0, posts: 1, tasks: 2, discussion: 3, team: 4, learning: 5, governance: 6, 'collected projects': 7 };
        return map[initialTab.toLowerCase()] ?? 0;
    }, [initialTab]);

    const [tabIndex, setTabIndex] = useState(initialTabIndex);

    const canEditTask = useCallback((task: Task) => {
        if (!currentUser) return false;
        const role = project.team.find(m => m.userId === currentUser.id)?.role;
        
        if (role === 'lead') return true;
        
        if (role === 'contributor') {
            if (task.createdBy === currentUser.id) return true;
            if (task.assignedToId === currentUser.id) return true;
            const creatorRole = project.team.find(m => m.userId === task.createdBy)?.role;
            if (creatorRole === 'contributor') return true;
        }

        if (role === 'participant') {
            if (task.createdBy === currentUser.id) return true;
            if (task.assignedToId === currentUser.id) return true;
        }
        return false;
    }, [currentUser, project.team]);

    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [acceptingInvite, setAcceptingInvite] = useState(false);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setProject(initialProject);
        setTasks(initialTasks);
        setDiscussions(initialDiscussions);
        setLearningPaths(initialLearningPaths);
        setUsers(allUsers);
        setChildProjects(initialChildProjects);

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
    const hasReadAccess = !isGuest || !!inviteToken;

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

    const handleAcceptInvite = async () => {
        if (!inviteToken) return;
        setAcceptingInvite(true);
        try {
            // Import dynamically or ensure it's available. We'll need to import acceptInviteAction
            const { acceptInviteAction } = await import('@/app/actions/invite');
            const res = await acceptInviteAction(inviteToken);
            if (res.success) {
                toast({ title: 'Success', description: 'You have joined the project!' });
                // We should remove the invite token from the URL to dismiss the banner
                router.replace(`/projects/${project.id}?tab=team`);
                router.refresh();
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setAcceptingInvite(false);
        }
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

    const handleMoveTask = async (taskId: string, newStatus: Task['status'], newSortOrder: number) => {
        const taskToMove = tasks.find(t => t.id === taskId);
        if (!taskToMove) return;

        // Start syncing
        setSyncingTasks(prev => new Set(prev).add(taskId));

        // Optimistically update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, sortOrder: newSortOrder } : t));

        const updatedTaskData: Task = {
            ...taskToMove,
            status: newStatus,
            sortOrder: newSortOrder,
        };

        const result = await updateTaskAction(updatedTaskData);
        
        if (!result.success) {
            // Revert on failure
            toast({ title: 'Error', description: result.error || 'Failed to move task', variant: 'destructive' });
            setTasks(prev => prev.map(t => t.id === taskId ? taskToMove : t));
        }

        // End syncing
        setSyncingTasks(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
        });
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

    const handleDeleteComment = async (commentId: string) => {
        const { deleteDiscussionComment } = await import('@/app/actions/projects');
        
        const previousDiscussions = [...discussions];
        setDiscussions(prev => prev.map(d => {
            if (d.id === commentId) {
                return {
                    ...d,
                    deletedAt: new Date().toISOString(),
                    deletedBy: d.userId === currentUser?.id ? 'author' : 'admin'
                };
            }
            return d;
        }));

        const result = await deleteDiscussionComment({ projectId: project.id, commentId });
        if (result.success) {
            toast({ title: 'Success', description: 'Comment deleted successfully!' });
        } else {
            setDiscussions(previousDiscussions);
            toast({ title: 'Error', description: result.error || 'Failed to delete comment.', variant: 'destructive' });
        }
    };

    const handleEditComment = async (commentId: string, content: string) => {
        const { editDiscussionComment } = await import('@/app/actions/projects');
        
        const previousDiscussions = [...discussions];
        setDiscussions(prev => prev.map(d => {
            if (d.id === commentId) {
                return {
                    ...d,
                    content,
                    editedAt: new Date().toISOString()
                };
            }
            return d;
        }));

        const result = await editDiscussionComment({ projectId: project.id, commentId, content });
        if (result.success && result.data) {
            toast({ title: 'Success', description: 'Comment edited successfully!' });
            setDiscussions(prev => prev.map(d => d.id === commentId ? result.data : d));
        } else {
            setDiscussions(previousDiscussions);
            toast({ title: 'Error', description: result.error || 'Failed to edit comment.', variant: 'destructive' });
        }
    };

    const handlePostSaved = (savedPost: Post) => {
        setPosts(prev => {
            const index = prev.findIndex(p => p.id === savedPost.id);
            if (index !== -1) {
                const next = [...prev];
                next[index] = savedPost;
                return next;
            }
            return [savedPost, ...prev];
        });
    };

    const handleDeletePost = async (postId: string, wasDraft: boolean) => {
        // Optimistic update first
        if (wasDraft) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        } else {
            setPosts(prev =>
                prev.map(p =>
                    p.id === postId
                        ? { ...p, deletedAt: new Date().toISOString(), deletedBy: 'author' as const }
                        : p
                )
            );
        }

        const result = await deletePostAction(postId);

        if (result.error) {
            // Roll back optimistic update
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            // Re-fetch is handled by revalidatePath server-side; local rollback is a best-effort
            if (wasDraft) {
                // We can't easily restore a hard-deleted draft, so just let the server revalidate
            } else {
                setPosts(prev =>
                    prev.map(p =>
                        p.id === postId ? { ...p, deletedAt: undefined, deletedBy: undefined } : p
                    )
                );
            }
        } else {
            toast({
                title: wasDraft ? 'Draft deleted' : 'Post deleted',
                description: wasDraft
                    ? 'The draft has been permanently deleted.'
                    : 'The post has been removed.',
            });
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

    const renderInviteBanner = () => {
        if (!inviteToken) return null;
        
        return (
            <div className="sticky top-0 z-50 w-full bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 p-4 shadow-sm backdrop-blur-sm">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm sm:text-base text-blue-900 dark:text-blue-100">
                        <strong>You&apos;ve been invited!</strong> Join {project.name} to collaborate with the team.
                    </div>
                    <div>
                        {!currentUser ? (
                            <Button 
                                size="sm" 
                                onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(`/projects/${project.id}?tab=team&inviteToken=${inviteToken}`)}`)}
                            >
                                Sign up to Accept
                            </Button>
                        ) : (
                            <Button size="sm" onClick={handleAcceptInvite} disabled={acceptingInvite}>
                                {acceptingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Accept Invitation
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderInviteBanner()}
            <div className="container mx-auto px-4 py-8">
                <ProjectHeader project={project} currentUser={currentUser} onJoin={handleJoinProject} onLeave={handleLeaveProject} />

            {/* Action bar — Member of indicator (left) + action buttons (right) */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap min-h-[36px]">
                <MemberOfIndicator 
                    key={`member-of-${project.id}-${membershipVersion}`} 
                    projectId={project.id} 
                    currentUserId={currentUser?.id ?? null} 
                    onMembershipChanged={handleMembershipChanged}
                />
                {!isGuest && (
                    <div className="flex items-center gap-2 ml-auto">
                        {isMember && currentUser && (
                            <CreatePostDialog project={project} currentUser={currentUser} onPostSaved={handlePostSaved} />
                        )}
                        <AddToCollectionButton 
                            projectId={project.id} 
                            isGuest={isGuest} 
                            initialParentProjectId={project.parentProjectId}
                            onMembershipChanged={handleMembershipChanged}
                        />
                    </div>
                )}
            </div>

            <div className="mt-8">
                <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}>
                    <TabList>
                        <Tab>About</Tab>
                        <Tab>Posts</Tab>
                        <Tab>Tasks</Tab>
                        <Tab>Discussion</Tab>
                        <Tab>Team</Tab>
                        <Tab>Learning Paths</Tab>
                        <Tab>Governance</Tab>
                        {childProjects.length > 0 && <Tab>Collected Projects</Tab>}
                    </TabList>

                    <TabPanel>
                        <div className="prose dark:prose-invert max-w-none p-4 relative">
                            <div className={!hasReadAccess ? "blur-md pointer-events-none select-none" : ""}>
                                <Markdown content={project.description} />
                            </div>
                            {!hasReadAccess && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/30 dark:bg-black/30">
                                    <GuestOverlay />
                                </div>
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        {hasReadAccess ? (
                            <ProjectPostsTab posts={posts} users={users} currentUser={currentUser ?? undefined} project={project} onPostSaved={handlePostSaved} onPostDeleted={handleDeletePost} />
                        ) : (
                            <div className="relative py-12 flex justify-center">
                                <div className="absolute inset-0 blur-md pointer-events-none opacity-50">
                                    <ProjectPostsTab posts={posts.slice(0, 1)} users={users} currentUser={currentUser ?? undefined} project={project} onPostSaved={handlePostSaved} onPostDeleted={handleDeletePost} />
                                </div>
                                <GuestOverlay />
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                        {hasReadAccess ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    {isMember && (
                                        <AddTaskDialog projectId={project.id} status="To Do" addTask={handleAddTask}>
                                            <Button>Add Task</Button>
                                        </AddTaskDialog>
                                    )}
                                </div>
                                <TaskBoard tasks={tasks} users={users} onEditTask={handleOpenEditTaskDialog} onDeleteTask={handleDeleteTask} onMoveTask={handleMoveTask} syncingTasks={syncingTasks} canEditTask={canEditTask} />
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
                         {hasReadAccess ? (
                            <DiscussionForum 
                                discussions={hydratedDiscussions}
                                onAddComment={handleAddComment}
                                onEditComment={handleEditComment}
                                onDeleteComment={handleDeleteComment}
                                isMember={isMember || false}
                                currentUser={currentUser}
                                users={users}
                                isProjectLead={isLead || false}
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
                        {hasReadAccess ? (
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
                            ) : (
                                <div className="relative py-12 flex justify-center">
                                    <GuestOverlay />
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
                            ) : <p>No recommended learning paths for this project yet.</p>}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="p-4">
                            <h2 className="text-xl font-bold">Governance</h2>
                            <p>Details about project governance and decision-making.</p>
                        </div>
                    </TabPanel>
                    {childProjects.length > 0 && (
                        <TabPanel>
                            <div className="p-4 space-y-4">
                                <h2 className="text-xl font-bold">Collected Projects</h2>
                                <p className="text-sm text-muted-foreground">
                                    Projects nested under {project.name}.
                                </p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {childProjects.map(child => (
                                        <a
                                            key={child.id}
                                            href={buildHybridUrl('/projects', child.id, child.name)}
                                            className="group flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                                                <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                                    {child.name}
                                                </span>
                                            </div>
                                            {child.tagline && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">{child.tagline}</p>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </TabPanel>
                    )}
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
        </>
    );
}
