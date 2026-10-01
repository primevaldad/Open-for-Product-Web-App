'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { toDate } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import type {
    User,
    HydratedProject,
    HydratedProjectMember,
    ProjectMember,
    Task,
    Discussion,
    LearningPath,
    HydratedDiscussion,
    Post,
    Activity,
    FundryFundingGoal,
    FundryAllocation,
    FundryContribution,
} from '@/lib/types';
import { type TaskFormValues } from '@/lib/schemas';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import { OnboardContributorDialog } from '@/components/projects/onboard-contributor-dialog';
import ProjectTeam from '@/components/project-team';
import { CreatePostDialog } from '@/components/projects/create-post-dialog';
import ProjectGovernance from '@/components/projects/project-governance';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';
import { useAuth } from '@/components/auth-provider';
import {
    Layers,
    Plus,
    Check,
    ChevronDown,
    Loader2,
    Search,
    Minus,
    FolderOpen,
    X,
    Star,
    StarOff,
    FilePenLine,
    ChevronRight,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
    joinProject as joinProjectAction,
    leaveProject as leaveProjectAction,
    addDiscussionComment as addDiscussionCommentAction,
    addTask as addTaskAction,
    updateTask as updateTaskAction,
    deleteTask as deleteTaskAction,
    toggleFollowProjectAction,
} from '@/app/actions/projects';
import {
    applyForRole as applyForRoleAction,
    approveRoleApplication as approveRoleApplicationAction,
    denyRoleApplication as denyRoleApplicationAction,
} from '@/app/actions/roles';
import {
    getCollectionsForCuration,
    addProjectToCollectionAction,
    removeProjectFromCollectionAction,
    getCollectionsContainingProject,
} from '@/app/actions/collections';
import { deletePostAction } from '@/app/actions/post';
import {
    subscribeToProjectTasks,
    subscribeToProjectFundingGoals,
    subscribeToProjectTeam,
    findUserById,
} from '@/lib/data.client';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { LeadDashboardTab } from '@/components/projects/lead-dashboard-tab';
import { getDeterministicPlaceholder, cn } from '@/lib/utils';
import { buildHybridUrl } from '@/lib/slug';

import { addProjectToProjectAction, removeProjectFromProjectAction, getUserLeadProjectsAction } from '@/app/actions/projects';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    activities?: Activity[];
    isQueenEnabled?: boolean;
    parentOptions?: Array<{ id: string; title: string; type: 'project' | 'collection' | 'platform' }>;
    fundingGoals?: FundryFundingGoal[];
    fundingAllocations?: FundryAllocation[];
    fundingContributions?: FundryContribution[];
}

type CurationTarget =
    | { type: 'collection'; id: string; name: string; description?: string; ownerId: string }
    | { type: 'project'; id: string; name: string; description?: string; ownerId: string };

// ---------------------------------------------------------------------------
// Accordion helper
// ---------------------------------------------------------------------------

function Accordion({
    title,
    children,
    defaultOpen = false,
    badge,
    signal,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
    signal?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border rounded-xl overflow-hidden bg-card">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors gap-3"
                aria-expanded={open}
            >
                <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-3 font-semibold text-sm text-foreground">
                        {title}
                        {badge}
                    </span>
                    {signal && (
                        <span className="text-[11px] text-muted-foreground font-normal tracking-wide">
                            {signal}
                        </span>
                    )}
                </span>
                <ChevronRight
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                />
            </button>
            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-border/50">
                    {children}
                </div>
            )}
        </div>
    );
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
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
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
                <div className="border-t px-3 py-2 flex items-center justify-between">
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

// ---------------------------------------------------------------------------
// Guest sign-in overlay
// ---------------------------------------------------------------------------

function GuestOverlay({ router }: { router: ReturnType<typeof useRouter> }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-2">Sign in to view this section</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-5 text-center text-sm max-w-md">
                Join the Open for Product community to access the full project workspace.
            </p>
            <div className="flex gap-3">
                <Button size="sm" onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`)}>
                    Log In
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/signup?redirectTo=${encodeURIComponent(window.location.pathname)}`)}>
                    Sign Up
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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
    activities,
    isQueenEnabled,
    parentOptions,
    fundingGoals = [],
    fundingAllocations = [],
    fundingContributions = [],
}: ProjectDetailClientPageProps) {
    const { currentUser: clientUser } = useAuth();
    const currentUser = clientUser || serverUser;
    const [project, setProject] = useState(initialProject);
    const [membershipVersion, setMembershipVersion] = useState(0);
    const [isOnboardDialogOpen, setIsOnboardDialogOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(
        currentUser?.followedProjectIds?.includes(initialProject.id) || false
    );
    const [isFollowLoading, setIsFollowLoading] = useState(false);

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
    const [liveFundingGoals, setLiveFundingGoals] = useState(fundingGoals);

    useEffect(() => {
        const unsubTasks = subscribeToProjectTasks(project.id, (newTasks) => {
            setTasks(newTasks);
        });
        const unsubGoals = subscribeToProjectFundingGoals(project.id, (newGoals) => {
            setLiveFundingGoals(newGoals);
        });
        return () => {
            unsubTasks();
            unsubGoals();
        };
    }, [project.id]);

    const [syncingTasks, setSyncingTasks] = useState<Set<string>>(new Set());
    const [discussions, setDiscussions] = useState(initialDiscussions);
    const [posts, setPosts] = useState(initialPosts);
    const [learningPaths] = useState(initialLearningPaths);
    const [users, setUsers] = useState(allUsers);
    const [childProjects] = useState(initialChildProjects);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const usersRef = useRef<User[]>(users);
    useEffect(() => { usersRef.current = users; }, [users]);

    useEffect(() => {
        const unsub = subscribeToProjectTeam(project.id, async (rawTeam: ProjectMember[]) => {
            const usersMap = new Map(usersRef.current.map(u => [u.id, u]));
            const hydratedTeam: HydratedProjectMember[] = await Promise.all(
                rawTeam.map(async (member) => {
                    let user = usersMap.get(member.userId);
                    if (!user) {
                        const fetched = await findUserById(member.userId);
                        if (fetched) {
                            user = fetched;
                            setUsers(prev =>
                                prev.some(u => u.id === fetched.id) ? prev : [...prev, fetched]
                            );
                        }
                    }
                    return { ...member, user: user! };
                })
            );
            setProject(prev => ({ ...prev, team: hydratedTeam }));
        });
        return () => unsub();
    }, [project.id]);

    useEffect(() => {
        setProject(initialProject);
        setTasks(initialTasks);
        setDiscussions(initialDiscussions);
        setUsers(allUsers);
        setPosts(initialPosts);
    }, [initialProject, initialTasks, initialDiscussions, allUsers, initialPosts]);

    // ---------------------------------------------------------------------------
    // Derived state
    // ---------------------------------------------------------------------------

    const hydratedDiscussions: HydratedDiscussion[] = useMemo(() => {
        const usersMap = new Map(users.map(u => [u.id, u]));
        const nest = (list: Discussion[]): HydratedDiscussion[] => {
            const discussionMap = new Map(list.map(d => [d.id, { ...d, user: usersMap.get(d.userId), replies: [] as HydratedDiscussion[] }]));
            const nested: HydratedDiscussion[] = [];
            for (const discussion of discussionMap.values()) {
                if (discussion.parentId) {
                    const parent = discussionMap.get(discussion.parentId);
                    if (parent) parent.replies.push(discussion);
                    else nested.push(discussion);
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

    const isOwner = !!currentUser && currentUser.id === project.owner?.id;
    const showLeadDashboard = isLead || isOwner;
    const isGuest = !currentUser || currentUser.role === 'guest';
    const hasReadAccess = !isGuest || !!inviteToken;

    const getHighestProjectRole = useCallback((userId: string) => {
        const roles = project.team.filter(m => m.userId === userId).map(m => m.role);
        if (roles.includes('lead')) return 'lead';
        if (roles.includes('contributor')) return 'contributor';
        if (roles.includes('participant')) return 'participant';
        return undefined;
    }, [project.team]);

    const canEditTask = useCallback((task: Task) => {
        if (!currentUser) return false;
        if (task.assignedToId === currentUser.id) return true;
        const role = getHighestProjectRole(currentUser.id);
        if (role === 'lead') return true;
        if (role === 'contributor') {
            if (task.createdBy === currentUser.id) return true;
            const creatorRole = getHighestProjectRole(task.createdBy);
            if (creatorRole === 'contributor') return true;
        }
        if (role === 'participant') {
            if (task.createdBy === currentUser.id) return true;
        }
        return false;
    }, [currentUser, getHighestProjectRole]);

    const selectableFundingGoals = useMemo(() => {
        const isAdmin = currentUser?.role === 'admin';
        return liveFundingGoals.filter(goal => {
            if (isLead || isAdmin || isOwner) return true;
            if (isMember && (goal.visibility === 'members' || goal.visibility === 'public')) return true;
            if (goal.visibility === 'public') return true;
            return false;
        });
    }, [liveFundingGoals, isLead, isMember, isOwner, currentUser]);

    // ---------------------------------------------------------------------------
    // Navigation (4-section)
    // ---------------------------------------------------------------------------

    const SECTIONS = ['overview', 'activity', 'discussion', 'management'] as const;
    type Section = typeof SECTIONS[number];

    const sectionLabels: Record<Section, string> = {
        overview: 'Overview',
        activity: 'Activity',
        discussion: 'Discussion',
        management: 'Management',
    };

    // Alias old tab keys → new section keys for backward-compat
    const tabAliases: Record<string, Section> = useMemo(() => ({
        about: 'overview',
        posts: 'activity',
        work: 'activity',
        tasks: 'activity',
        team: 'activity',
        learning: 'activity',
        'learning paths': 'activity',
        'collected projects': 'overview',
        dialogue: 'discussion',
        discussions: 'discussion',
        governance: 'management',
        fundry: 'management',
        lead: 'management',
        'lead dashboard': 'management',
    }), []);

    const resolveSection = useCallback((raw: string): Section => {
        const normalized = raw.toLowerCase();
        if (SECTIONS.includes(normalized as Section)) return normalized as Section;
        return tabAliases[normalized] ?? 'overview';
    }, [tabAliases]);

    const [activeSection, setActiveSection] = useState<Section>(() => {
        if (!initialTab) return 'overview';
        return resolveSection(initialTab);
    });

    const [acceptingInvite, setAcceptingInvite] = useState(false);
    const [rejectingInvite, setRejectingInvite] = useState(false);
    const [inviteRejected, setInviteRejected] = useState(false);
    const [inviteAccepted, setInviteAccepted] = useState(false);
    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const router = useRouter();
    const { toast } = useToast();

    const handleSectionChange = (section: Section) => {
        setActiveSection(section);
        const newUrl = `${window.location.pathname}?tab=${section}${inviteToken ? `&inviteToken=${inviteToken}` : ''}`;
        window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    };

    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const rawTab = params.get('tab') || 'overview';
            setActiveSection(resolveSection(rawTab));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [resolveSection]);

    // ---------------------------------------------------------------------------
    // Action handlers
    // ---------------------------------------------------------------------------

    const handleServerResponse = (
        result: { success: boolean; [key: string]: any },
        successMessage: string,
        failureMessage: string
    ) => {
        if (result.success) {
            toast({ title: 'Success', description: result.message || successMessage });
            router.refresh();
        } else {
            toast({ title: 'Error', description: result.error || failureMessage, variant: 'destructive' });
        }
    };

    const handleToggleFollow = async () => {
        if (!currentUser) {
            toast({ title: 'Authentication required', description: 'Please login to follow projects.', variant: 'destructive' });
            return;
        }
        setIsFollowLoading(true);
        try {
            const result = await toggleFollowProjectAction(project.id);
            if (result.success && result.data) {
                setIsFollowing(result.data.isFollowing);
                toast({
                    title: result.data.isFollowing ? 'Following Project' : 'Unfollowed Project',
                    description: result.data.isFollowing
                        ? `You will now see updates for ${project.name} in your feed.`
                        : `You will no longer see updates for ${project.name}.`,
                });
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleJoinProject = async () => {
        if (!currentUser) {
            toast({ title: 'Error', description: 'You must be logged in to join a project.', variant: 'destructive' });
            return;
        }
        setIsOnboardDialogOpen(true);
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
            const { acceptInviteAction } = await import('@/app/actions/invite');
            const res = await acceptInviteAction(inviteToken);
            if (res.success) {
                setInviteAccepted(true);
                toast({ title: 'Success', description: 'You have joined the project!' });
                setIsOnboardDialogOpen(true);
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setAcceptingInvite(false);
        }
    };

    const handleRejectInviteByToken = async () => {
        if (!inviteToken) return;
        setRejectingInvite(true);
        try {
            const { rejectInviteByTokenAction } = await import('@/app/actions/invite');
            const res = await rejectInviteByTokenAction(inviteToken);
            if (res.success) {
                setInviteRejected(true);
                toast({ title: 'Invitation declined', description: 'You have declined the project invitation.' });
            } else {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
            }
        } finally {
            setRejectingInvite(false);
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
            fundingGoalIds: values.fundingGoalIds || [],
        };
        const result = await addTaskAction(taskDataForAction);
        if (result.success && result.data) {
            setTasks(prev => [...prev, result.data]);
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
            assignedToId: values.assigneeId,
            dueDate: values.dueDate ? values.dueDate.toISOString() : editingTask.dueDate,
        };
        delete (updatedTaskData as any).assigneeId;
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
        setSyncingTasks(prev => new Set(prev).add(taskId));
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, sortOrder: newSortOrder } : t));
        const updatedTaskData: Task = { ...taskToMove, status: newStatus, sortOrder: newSortOrder };
        const result = await updateTaskAction(updatedTaskData);
        if (!result.success) {
            toast({ title: 'Error', description: result.error || 'Failed to move task', variant: 'destructive' });
            setTasks(prev => prev.map(t => t.id === taskId ? taskToMove : t));
        }
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
            setDiscussions(curr => [...curr, result.data]);
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
                return { ...d, deletedAt: new Date().toISOString(), deletedBy: d.userId === currentUser?.id ? 'author' : 'admin' };
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
        setDiscussions(prev => prev.map(d => d.id === commentId ? { ...d, content, editedAt: new Date().toISOString() } : d));
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
        if (wasDraft) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        } else {
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, deletedAt: new Date().toISOString(), deletedBy: 'author' as const } : p));
        }
        const result = await deletePostAction(postId);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            if (!wasDraft) {
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, deletedAt: undefined, deletedBy: undefined } : p));
            }
        } else {
            toast({ title: wasDraft ? 'Draft deleted' : 'Post deleted' });
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

    // ---------------------------------------------------------------------------
    // Derived data
    // ---------------------------------------------------------------------------

    const fallbackImage = getDeterministicPlaceholder(project.id);
    const leadCount = project.team.filter(m => m?.role === 'lead').length;
    const publishedPosts = posts.filter(p => p.status !== 'draft');
    const draftPosts = posts.filter(p => p.status === 'draft');

    // ---------------------------------------------------------------------------
    // Invite banner
    // ---------------------------------------------------------------------------

    const renderInviteBanner = () => {
        if (!inviteToken || inviteAccepted) return null;
        if (currentUser && project.team.some(m => m.userId === currentUser.id)) return null;

        if (inviteRejected) {
            return (
                <div className="sticky top-0 z-50 w-full bg-[#FDFBF7]/95 dark:bg-gray-900/95 border-b p-4 shadow-sm backdrop-blur-sm">
                    <div className="container mx-auto flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <span>You have declined the invitation to <strong>{project.name}</strong>.</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="sticky top-0 z-50 w-full bg-[#FDFBF7]/95 dark:bg-gray-900/95 border-b p-4 shadow-sm backdrop-blur-sm">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm sm:text-base text-blue-900 dark:text-blue-100">
                        <strong>You&apos;ve been invited!</strong> Join {project.name} to collaborate with the team.
                    </div>
                    <div className="flex items-center gap-2">
                        {!currentUser ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(`/projects/${project.id}?tab=discussion&inviteToken=${inviteToken}`)}`)}
                                >
                                    Sign up to Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRejectInviteByToken}
                                    disabled={rejectingInvite}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    {rejectingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reject Invitation
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" onClick={handleAcceptInvite} disabled={acceptingInvite || rejectingInvite}>
                                    {acceptingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Accept Invitation
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRejectInviteByToken}
                                    disabled={acceptingInvite || rejectingInvite}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    {rejectingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reject Invitation
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <>
            {renderInviteBanner()}

            {/* ================================================================
                COMPACT WORKSPACE HEADER
                ================================================================ */}
            <div className="relative w-full overflow-hidden" style={{ height: '200px' }}>
                {/* Background image */}
                <Image
                    src={project.photoUrl || fallbackImage}
                    alt={`${project.name} workspace`}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

                {/* Header content */}
                <div className="absolute inset-0 flex flex-col justify-between px-6 py-3 container mx-auto">

                    {/* Top row: breadcrumb (left) + Edit / Leave (right) */}
                    <div className="flex items-center justify-between">
                        <Link
                            href="/projects"
                            className="inline-flex items-center text-xs text-white font-medium bg-black/40 backdrop-blur-sm hover:bg-black/55 transition-colors rounded-md px-2.5 py-1.5 gap-1"
                        >
                            ← Projects
                        </Link>

                        {/* Upper-right: Edit + Leave */}
                        <div className="flex items-center gap-2">
                            {isLead && (
                                <Link href={`/projects/${project.id}/edit`}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-white font-medium bg-black/40 backdrop-blur-sm hover:bg-black/55 px-2.5"
                                    >
                                        <FilePenLine className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                    </Button>
                                </Link>
                            )}
                            {isMember && currentUser && (!isLead || leadCount > 1) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-red-200 font-medium bg-black/40 backdrop-blur-sm hover:bg-red-900/60 px-2.5"
                                    onClick={handleLeaveProject}
                                >
                                    Leave Project
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Bottom row: title + badges (left) + main actions (right) */}
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        {/* Title + tagline + badges */}
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-2xl font-bold text-white truncate leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                                    {project.name}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="capitalize text-xs border-white/30 text-white/80 bg-white/10 backdrop-blur-sm shrink-0"
                                >
                                    {project.status}
                                </Badge>
                                {currentUser && (
                                    <Badge className="capitalize text-xs bg-amber-500/80 text-white border-0 backdrop-blur-sm shrink-0">
                                        {isLead ? 'Project Lead' : isMember ? 'Contributor' : 'Visitor'}
                                    </Badge>
                                )}
                            </div>
                            {project.tagline && (
                                <p className="text-sm text-white/80 leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                                    {project.tagline}
                                </p>
                            )}
                        </div>

                        {/* Main action buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Member of indicator */}
                            <div className="text-white/70">
                                <MemberOfIndicator
                                    key={`member-of-${project.id}-${membershipVersion}`}
                                    projectId={project.id}
                                    currentUserId={currentUser?.id ?? null}
                                    onMembershipChanged={handleMembershipChanged}
                                />
                            </div>

                            {/* Add to Collection */}
                            {!isGuest && (
                                <AddToCollectionButton
                                    projectId={project.id}
                                    isGuest={isGuest}
                                    initialParentProjectId={project.parentProjectId}
                                    onMembershipChanged={handleMembershipChanged}
                                />
                            )}

                            {/* Create Post — members only */}
                            {isMember && currentUser && (
                                <CreatePostDialog
                                    project={project}
                                    currentUser={currentUser}
                                    onPostSaved={handlePostSaved}
                                />
                            )}

                            {/* Follow — non-members only */}
                            {!isMember && currentUser && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToggleFollow}
                                    disabled={isFollowLoading}
                                    className={cn(
                                        'h-8 text-xs border-white/30 text-white/90 bg-white/10 hover:bg-white/20 backdrop-blur-sm',
                                        isFollowing && 'bg-amber-500/30 border-amber-400/50 text-amber-200 hover:bg-amber-500/40'
                                    )}
                                >
                                    {isFollowLoading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : isFollowing ? (
                                        <StarOff className="h-3.5 w-3.5 mr-1.5" />
                                    ) : (
                                        <Star className="h-3.5 w-3.5 mr-1.5" />
                                    )}
                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                </Button>
                            )}

                            {/* Join — non-members only */}
                            {!isMember && currentUser && (
                                <Button
                                    size="sm"
                                    className="h-8 text-xs font-semibold"
                                    onClick={handleJoinProject}
                                >
                                    Join Project
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================
                SECTION NAVIGATION
                ================================================================ */}
            <div className="border-b bg-background sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6">
                    <nav className="flex gap-0" role="tablist" aria-label="Project sections">
                        {SECTIONS.map(section => (
                            <button
                                key={section}
                                role="tab"
                                aria-selected={activeSection === section}
                                onClick={() => handleSectionChange(section)}
                                className={cn(
                                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                                    activeSection === section
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                                )}
                            >
                                {sectionLabels[section]}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* ================================================================
                SECTION CONTENT
                ================================================================ */}
            <div className="container mx-auto px-4 sm:px-6 py-8">

                {/* ── OVERVIEW ─────────────────────────────────────────────── */}
                {activeSection === 'overview' && (
                    <div className="space-y-4 max-w-4xl">
                        {/* Gated content wrapper */}
                        <div className={!hasReadAccess ? 'relative' : ''}>
                            <div className={!hasReadAccess ? 'blur-md pointer-events-none select-none space-y-4' : 'space-y-4'}>

                                <Accordion
                                    title="Description"
                                    defaultOpen={true}
                                    signal="About this project"
                                >
                                    {/* Tags — first element inside accordion */}
                                    {project.tags && project.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {project.tags.map(tag => (
                                                <Badge key={tag.id} variant={tag.isCategory ? 'secondary' : 'outline'}>{tag.display}</Badge>
                                            ))}
                                        </div>
                                    )}
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        <Markdown content={project.description} />
                                    </div>
                                </Accordion>

                                <Accordion
                                    title="Mission & Vision"
                                    signal="Project Context"
                                >
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        {project.mission ? (
                                            <Markdown content={project.mission} />
                                        ) : (
                                            <p className="text-muted-foreground italic">No mission statement provided yet.</p>
                                        )}
                                    </div>
                                </Accordion>

                                <Accordion
                                    title="Current Focus"
                                    signal={project.currentFocus ? 'Now' : 'Not defined'}
                                >
                                    <div className="prose dark:prose-invert max-w-none text-sm">
                                        {project.currentFocus ? (
                                            <Markdown content={project.currentFocus} />
                                        ) : (
                                            <p className="text-muted-foreground italic">No current focus provided yet.</p>
                                        )}
                                    </div>
                                </Accordion>

                                {/* Connected Projects */}
                                {childProjects.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Connected Projects</h2>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                                )}
                            </div>

                            {!hasReadAccess && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 dark:bg-black/30 rounded-xl">
                                    <GuestOverlay router={router} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ACTIVITY ─────────────────────────────────────────────── */}
                {activeSection === 'activity' && (
                    <div className="space-y-4">

                        {/* Tasks accordion — expanded by default */}
                        <Accordion
                            title="Tasks"
                            defaultOpen={true}
                            signal={tasks.length > 0
                                ? `${tasks.filter(t => t.status === 'Done').length} of ${tasks.length} done`
                                : 'No tasks yet'
                            }
                            badge={
                                <Badge variant="outline" className="text-[9px]">
                                    {tasks.filter(t => t.status !== 'Done').length} active
                                </Badge>
                            }
                        >
                            {/* Stat row — always visible inside accordion, not scrolled */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                                <Card className="p-3 text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Active</span>
                                    <span className="text-2xl font-bold">{tasks.filter(t => t.status !== 'Done').length}</span>
                                </Card>
                                <Card className="p-3 text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block text-red-500">Blocked</span>
                                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {tasks.filter(t => t.title.toLowerCase().includes('blocked') || t.description?.toLowerCase().includes('blocked')).length}
                                    </span>
                                </Card>
                                <Card className="p-3 text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block text-emerald-500">Completed</span>
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tasks.filter(t => t.status === 'Done').length}</span>
                                </Card>
                                <Card className="p-3 text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Needs Owner</span>
                                    <span className="text-2xl font-bold">{tasks.filter(t => !t.assignedToId).length}</span>
                                </Card>
                                <Card className="p-3 text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block text-blue-500">Ready</span>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tasks.filter(t => t.status === 'To Do').length}</span>
                                </Card>
                            </div>

                            {/* Scrollable task board */}
                            <div className="overflow-y-auto overflow-x-auto max-h-[65vh] pr-1 rounded-lg">
                                {hasReadAccess ? (
                                    <TaskBoard
                                        tasks={tasks}
                                        users={users}
                                        onEditTask={handleOpenEditTaskDialog}
                                        onDeleteTask={handleDeleteTask}
                                        onMoveTask={handleMoveTask}
                                        syncingTasks={syncingTasks}
                                        canEditTask={canEditTask}
                                        projectId={project.id}
                                        addTask={handleAddTask}
                                        isMember={isMember}
                                        isLead={isLead || currentUser?.role === 'admin'}
                                        fundingGoals={liveFundingGoals}
                                        selectableFundingGoals={selectableFundingGoals}
                                    />
                                ) : (
                                    <div className="relative h-64 flex items-center justify-center">
                                        <div className="absolute inset-0 blur-sm pointer-events-none opacity-50">
                                            <TaskBoard tasks={tasks.slice(0, 2)} users={users} onEditTask={() => {}} onDeleteTask={() => {}} />
                                        </div>
                                        <GuestOverlay router={router} />
                                    </div>
                                )}
                            </div>
                        </Accordion>

                        {/* Team accordion */}
                        <Accordion
                            title="Team"
                            signal={(() => {
                                const leads = project.team.filter(m => m.role === 'lead').length;
                                return leads > 0 ? `${leads} lead${leads !== 1 ? 's' : ''}` : 'No leads assigned';
                            })()}
                            badge={
                                <Badge variant="outline" className="text-[9px]">
                                    {project.team.length} {project.team.length === 1 ? 'member' : 'members'}
                                </Badge>
                            }
                        >
                            <div className="overflow-y-auto max-h-[65vh] pr-1">
                                {hasReadAccess ? (
                                    <ProjectTeam
                                        projectId={project.id}
                                        projectName={project.name}
                                        team={project.team}
                                        users={users}
                                        currentUser={currentUser}
                                        addTeamMember={() => {}}
                                        isLead={isLead || false}
                                        applyForRole={handleApplyForRole}
                                        approveRoleApplication={handleApproveRoleApplication}
                                        denyRoleApplication={handleDenyRoleApplication}
                                    />
                                ) : (
                                    <div className="relative py-12 flex justify-center border rounded-xl">
                                        <GuestOverlay router={router} />
                                    </div>
                                )}
                            </div>
                        </Accordion>

                        {/* Learning accordion */}
                        <Accordion
                            title="Learning"
                            signal="Skill Paths"
                            badge={
                                <Badge variant="outline" className="text-[9px]">
                                    {learningPaths.length} {learningPaths.length === 1 ? 'path' : 'paths'}
                                </Badge>
                            }
                        >
                            <div className="overflow-y-auto max-h-[65vh] pr-1">
                                {learningPaths.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {learningPaths.map(path => (
                                            <Card key={path.pathId} className="p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <h3 className="font-bold text-base">{path.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-2">{path.description}</p>
                                                <div className="mt-4">
                                                    <Link href={`/learning/${path.pathId}`}>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                                                            Start Path
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm italic">No recommended learning paths for this project yet.</p>
                                )}
                            </div>
                        </Accordion>

                        {/* Recent Updates + Event Logs accordion */}
                        <Accordion
                            title="Recent"
                            signal={publishedPosts.length > 0
                                ? `Last update ${new Date(publishedPosts[publishedPosts.length - 1]?.createdAt as string).toLocaleDateString()}`
                                : 'Activity Feed'
                            }
                            badge={
                                <Badge variant="outline" className="text-[9px]">
                                    {publishedPosts.length} {publishedPosts.length === 1 ? 'update' : 'updates'}
                                </Badge>
                            }
                        >
                            <div className="overflow-y-auto max-h-[65vh] pr-1 space-y-6">

                                {/* Published posts */}
                                {publishedPosts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No updates published yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {publishedPosts.map(post => (
                                            <Card
                                                key={post.id}
                                                className="p-4 space-y-2 relative hover:shadow-md transition-shadow cursor-pointer border-muted/50 bg-muted/20"
                                                onClick={() => setSelectedPost(post)}
                                            >
                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Published Update</span>
                                                    <span>{new Date(post.createdAt as string).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-foreground/90">{post.title}</h4>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                                                <span className="text-[10px] text-primary font-semibold hover:underline block pt-1">Read full update &rarr;</span>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Draft Updates — members/leads only */}
                                {(isLead || isMember || currentUser?.role === 'admin') && draftPosts.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t">
                                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                            Draft Updates
                                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-semibold">Lead/Contributor Only</Badge>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {draftPosts.map(post => {
                                                const isAuthor = currentUser && post.userId === currentUser.id;
                                                const cardInner = (
                                                    <Card
                                                        key={post.id}
                                                        className="p-4 space-y-2 relative border-dashed hover:shadow-sm cursor-pointer bg-card border-amber-200 dark:border-amber-800"
                                                        onClick={!isAuthor ? () => setSelectedPost(post) : undefined}
                                                    >
                                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                            <span className="font-semibold text-amber-600 dark:text-amber-400">Draft</span>
                                                            <span>{new Date(post.createdAt as string).toLocaleDateString()}</span>
                                                        </div>
                                                        <h4 className="font-bold text-sm text-foreground">{post.title}</h4>
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                                                        <span className="text-[10px] text-primary font-semibold hover:underline block pt-1">
                                                            {isAuthor ? 'Edit draft →' : 'Preview draft →'}
                                                        </span>
                                                    </Card>
                                                );
                                                if (isAuthor) {
                                                    return (
                                                        <CreatePostDialog
                                                            key={post.id}
                                                            project={project}
                                                            currentUser={currentUser}
                                                            post={post}
                                                            onPostSaved={handlePostSaved}
                                                            trigger={cardInner}
                                                        />
                                                    );
                                                }
                                                return cardInner;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Event Logs */}
                                {activities && activities.length > 0 && (
                                    <div className="space-y-2 pt-4 border-t">
                                        <h3 className="text-sm font-semibold text-muted-foreground">Event Logs</h3>
                                        <p className="text-xs text-muted-foreground">Event telemetry context utilized by Jester for daily briefings.</p>
                                        <div className="space-y-2 mt-2">
                                            {activities.map(activity => (
                                                <div key={activity.id} className="flex flex-col text-xs border-l-2 pl-3 pb-1 border-slate-200 dark:border-slate-800">
                                                    <span className="font-medium text-foreground/80 capitalize">{activity.type.replace(/-/g, ' ')}</span>
                                                    <span className="text-muted-foreground text-[10px]">{new Date(activity.timestamp as string).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Accordion>
                    </div>
                )}

                {/* ── DISCUSSION ───────────────────────────────────────────── */}
                {activeSection === 'discussion' && (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold">Discussion</h2>
                            <p className="text-xs text-muted-foreground">Share updates, ask questions, and brainstorm with the community.</p>
                        </div>
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
                            <div className="py-16 flex justify-center">
                                <GuestOverlay router={router} />
                            </div>
                        )}
                    </div>
                )}

                {/* ── MANAGEMENT ───────────────────────────────────────────── */}
                {activeSection === 'management' && (
                    <div className="space-y-4 max-w-4xl">
                        <div className="mb-2">
                            <h2 className="text-xl font-bold">Management</h2>
                            <p className="text-xs text-muted-foreground">Governance, funding, and project administration.</p>
                        </div>

                        {/* Governance accordion */}
                        <Accordion
                            title="Governance"
                            signal="Rules & Authority"
                            badge={
                                <Badge variant="outline" className="text-[9px] capitalize">
                                    {project.governanceConfig?.decisionModel?.replace(/_/g, ' ') || 'Lead-based'}
                                </Badge>
                            }
                        >
                            <div className="mt-3">
                                <ProjectGovernance
                                    project={project}
                                    currentUser={currentUser}
                                    isLead={isLead}
                                    parentOptions={parentOptions}
                                    renderSection="governance"
                                />
                            </div>
                        </Accordion>

                        {/* Fundry accordion — open by default */}
                        <Accordion
                            title="Fundry Portal"
                            defaultOpen={true}
                            signal={`${liveFundingGoals.length} funding goal${liveFundingGoals.length !== 1 ? 's' : ''}`}
                            badge={
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] dark:bg-emerald-950/20 dark:text-emerald-400 border">
                                    {project.fundry?.enabled ? 'Active' : 'Planning'}
                                </Badge>
                            }
                        >
                            <div className="mt-3">
                                <ProjectGovernance
                                    project={project}
                                    currentUser={currentUser}
                                    isLead={isLead}
                                    parentOptions={parentOptions}
                                    fundingGoals={liveFundingGoals}
                                    fundingAllocations={fundingAllocations}
                                    fundingContributions={fundingContributions}
                                    renderSection="fundry"
                                />
                            </div>
                        </Accordion>

                        {/* Lead Console — only for leads/owners/admins */}
                        {showLeadDashboard ? (
                            <Accordion
                                title="Lead Console"
                                signal={(() => {
                                    const blocked = tasks.filter(t =>
                                        t.title.toLowerCase().includes('blocked') ||
                                        t.description?.toLowerCase().includes('blocked')
                                    ).length;
                                    const funded = liveFundingGoals.filter(g => g.fundingStatus === 'funded' && g.workStatus === 'not_started').length;
                                    const total = blocked + funded;
                                    return total > 0 ? `${total} item${total !== 1 ? 's' : ''} need attention` : 'No immediate action needed';
                                })()}
                                badge={
                                    <Badge className="bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wide border-0 dark:bg-amber-950 dark:text-amber-300">
                                        Admin
                                    </Badge>
                                }
                            >
                                <div className="mt-3 space-y-6">
                                    {/* Needs Attention */}
                                    <Card className="border-amber-200 bg-amber-50/10 dark:bg-amber-950/5">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base font-bold text-amber-900 dark:text-amber-200">
                                                Needs Attention
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300 list-disc pl-5">
                                                {tasks.filter(t => t.title.toLowerCase().includes('blocked') || t.description?.toLowerCase().includes('blocked')).length > 0 && (
                                                    <li>
                                                        There are {tasks.filter(t => t.title.toLowerCase().includes('blocked') || t.description?.toLowerCase().includes('blocked')).length} blocked tasks on the board.
                                                    </li>
                                                )}
                                                {liveFundingGoals.filter(g => g.fundingStatus === 'funded' && g.workStatus === 'not_started').length > 0 && (
                                                    <li>
                                                        There are {liveFundingGoals.filter(g => g.fundingStatus === 'funded' && g.workStatus === 'not_started').length} fully funded goals ready to start.
                                                    </li>
                                                )}
                                                {!project.team.some(m => m.role === 'lead') && (
                                                    <li>This project does not have any active leads assigned.</li>
                                                )}
                                                <li>Review AI-generated task recommendations from Session Queen below.</li>
                                            </ul>
                                        </CardContent>
                                    </Card>

                                    {/* AI lead dashboard */}
                                    <LeadDashboardTab projectId={project.id} />
                                </div>
                            </Accordion>
                        ) : (
                            /* Non-lead users see a gated placeholder */
                            <div className="border rounded-xl p-6 bg-card text-center space-y-2">
                                <h3 className="font-semibold text-sm text-muted-foreground">Lead Console</h3>
                                <p className="text-xs text-muted-foreground italic">Available to project leads and admins only.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ================================================================
                DIALOGS / OVERLAYS
                ================================================================ */}

            {editingTask && (
                <EditTaskDialog
                    isOpen={isEditTaskDialogOpen}
                    onClose={handleCloseEditTaskDialog}
                    onSave={handleUpdateTask}
                    task={editingTask}
                    teamMembers={users}
                    isLead={isLead || currentUser?.role === 'admin'}
                    fundingGoals={selectableFundingGoals}
                />
            )}

            <OnboardContributorDialog
                isOpen={isOnboardDialogOpen}
                onClose={() => setIsOnboardDialogOpen(false)}
                projectId={project.id}
                projectName={project.name}
                projectMission={project.mission}
                isQueenEnabled={isQueenEnabled}
                onJoinManually={async () => {
                    const result = await joinProjectAction(project.id);
                    handleServerResponse(result, 'Successfully joined the project!', 'Failed to join the project.');
                    setIsOnboardDialogOpen(false);
                }}
            />

            {/* Post preview modal */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
                    <div className="bg-background border rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b p-4 bg-muted/30">
                            <div className="flex flex-col gap-0.5">
                                {selectedPost.status === 'draft' && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Draft</span>
                                )}
                                <h3 className="font-bold text-lg text-foreground">{selectedPost.title}</h3>
                                <span className="text-xs text-muted-foreground">
                                    {selectedPost.status === 'draft' ? 'Draft' : 'Published'} {new Date(selectedPost.createdAt as string).toLocaleString()} by{' '}
                                    {users.find(u => u.id === selectedPost.userId)?.name || users.find(u => u.id === selectedPost.userId)?.username || 'Unknown'}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedPost(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto prose dark:prose-invert max-w-none text-sm">
                            <Markdown content={selectedPost.content} />
                        </div>
                        <div className="border-t p-3 bg-muted/20 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => setSelectedPost(null)}>
                                Close
            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
