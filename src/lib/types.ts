
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';

// A string representing a user's unique ID. This will typically be a Firebase Auth UID.
export type UserId = string;

// A string representing a project's unique ID. This will be a Firestore document ID.
export type ProjectId = string;

// --- Core Data Models ---

export interface User {
    id: UserId;
    name: string;
    username?: string;
    email: string;
    role?: string; // Can be 'guest' or undefined for regular users
    avatarUrl?: string;
    interests?: ProfileTag[];
    bio?: string;
    draftProjects?: ProjectId[]; // IDs of projects the user is drafting
    onboardingCompleted: boolean;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    isExpert?: boolean;
    notifications?: Notification[];
    aiFeaturesEnabled?: boolean;
    company?: string;
    location?: string;
    website?: string;
    steemUsername?: string;
}

export interface Project {
    id: ProjectId;
    name: string;
    photoUrl?: string;
    tagline: string;
    description: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    startDate: Timestamp | string;
    endDate: Timestamp | string;
    ownerId?: UserId; // NOW OPTIONAL
    team: ProjectMember[];
    status: 'draft' | 'published' | 'archived';
    project_type?: 'public' | 'private' | 'personal';
    tags: ProjectTag[];
    contributionNeeds: string[];
    fallbackSuggestion?: string;
    isExpertReviewed?: boolean;
    governance?: {
        contributorsShare: number; // Percentage of ownership for contributors
        communityShare: number;    // Percentage of ownership for the community
        sustainabilityShare: number; // Percentage for project sustainability
    };
    progress?: number;
}

// This represents a tag that is associated with a project.
export interface ProjectTag {
    id: string;
    display: string;
    isCategory: boolean;
}

// This represents a tag that is associated with a user profile.
export interface ProfileTag {
    id: string;
    display: string;
}

// This represents a globally available tag that can be added to projects.
export interface GlobalTag {
    id: string;
    normalized: string;
    display: string;
    isCategory: boolean;
    usageCount: number;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    createdBy: UserId;
}

export interface ProjectMember {
    userId: UserId;
    role: 'lead' | 'contributor' | 'participant';
    pendingRole?: 'lead' | 'contributor' | 'participant';
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
}

// This is a more explicit definition of a hydrated project to avoid type inference issues.
export interface HydratedProject {
    id: ProjectId;
    name: string;
    photoUrl?: string;
    tagline: string;
    description: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    startDate: Timestamp | string;
    endDate: Timestamp | string;
    owner?: User; // NOW OPTIONAL
    team: HydratedProjectMember[];
    status: 'draft' | 'published' | 'archived';
    project_type?: 'public' | 'private' | 'personal';
    tags: ProjectTag[];
    contributionNeeds: string[];
    fallbackSuggestion?: string;
    isExpertReviewed?: boolean;
    governance?: {
        contributorsShare: number;
        communityShare: number;
        sustainabilityShare: number;
    };
    progress?: number;
}

export interface HydratedProjectMember {
    user: User;
    userId: UserId;
    role: 'lead' | 'contributor' | 'participant';
    pendingRole?: 'lead' | 'contributor' | 'participant';
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
}

export interface Discussion {
    id: string;
    projectId: ProjectId;
    userId: UserId;
    content: string;
    parentId?: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface HydratedDiscussion extends Discussion {
    user: User;
    replies: HydratedDiscussion[];
}

export interface Task {
    id: string;
    projectId: ProjectId;
    title: string;
    description: string;
    status: 'To Do' | 'In Progress' | 'Done' | 'Archived';
    createdBy: UserId;
    assignedToId?: string; // Can be a single user ID
    estimatedHours?: number;
    dueDate?: Timestamp | string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    isMilestone?: boolean;
}

export interface HydratedTask extends Omit<Task, 'assignedToId'> {
    assignee?: User;
}

// Represents a link between a Project and a Learning Path.
export interface ProjectPathLink {
    id: string; // Unique ID for the link itself
    projectId: ProjectId;
    pathId: string; // ID of the linked LearningPath
    learningPathId: string;
}

// --- Learning Path Data Models ---

export interface LearningPath {
    pathId: string;
    title: string;
    description: string;
    modules: Module[];
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    category?: string;
    isLocked?: boolean;
    duration?: number;
}

export interface Module {
    moduleId: string;
    title: string;
    contentType: 'video' | 'article' | 'quiz' | 'code-challenge';
    contentUrl: string;
    duration: number;
}

// Represents the progress of a user on a specific learning path.
export interface UserLearningProgress {
    id: string;
    userId: UserId;
    pathId: string;
    completedModules: string[];
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    startedAt: Timestamp | string;
    lastAccessed: Timestamp | string;
    completedAt?: Timestamp | string;
}

// --- Server Action Responses ---

export interface ServerActionResponse<T = any> {
    success: boolean;
    error?: string;
    data?: T;
}

// --- Discriminated Union Types for Page Data Responses ---

export interface HomePageData {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: GlobalTag[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
    suggestedProjects: HydratedProject[] | null;
    aiEnabled: boolean;
}

// --- HomePageData (Refactored for consistency) ---
export type HomePageDataSuccess = { success: true } & HomePageData;
export interface HomePageDataError {
    success: false;
    error: string;
}
export type HomePageDataResponse = HomePageDataSuccess | HomePageDataError;

// --- CreateProjectPageData ---
export interface CreateProjectPageDataSuccess {
    success: true;
    allTags: GlobalTag[];
    allUsers: User[];
}
export interface CreateProjectPageDataError {
    success: false;
    error: string;
}
export type CreateProjectPageDataResponse = CreateProjectPageDataSuccess | CreateProjectPageDataError;

// --- EditProjectPageData ---
export interface EditProjectPageDataSuccess {
    success: true;
    project: HydratedProject;
    allTags: GlobalTag[];
    allUsers: User[];
}
export interface EditProjectPageDataError {
    success: false;
    error: string;
}
export type EditProjectPageDataResponse = EditProjectPageDataSuccess | EditProjectPageDataError;


// --- DraftsPageData ---
export interface DraftsPageDataSuccess {
    success: true;
    drafts: HydratedProject[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
}
export interface DraftsPageDataError {
    success: false;
    error: string;
}
export type DraftsPageDataResponse = DraftsPageDataSuccess | DraftsPageDataError;


// --- Server Action Prop Types ---

export type JoinProjectAction = (projectId: string) => Promise<ServerActionResponse<HydratedProjectMember>>;
export type AddTeamMemberAction = (data: { projectId: string; userId: string; role: ProjectMember['role'] }) => Promise<ServerActionResponse<HydratedProjectMember>>;
export type AddDiscussionCommentAction = (data: { projectId: string; content: string, parentId?: string }) => Promise<ServerActionResponse<Discussion>>;
export type AddTaskAction = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<ServerActionResponse<Task>>;
export type UpdateTaskAction = (data: Task) => Promise<ServerActionResponse<Task>>;
export type DeleteTaskAction = (data: { id: string; projectId: string }) => Promise<ServerActionResponse<{}>>;

// --- Activity and Notification Types ---

export enum EventType {
  TAG_CREATED = 'tag-created',
  PROJECT_CREATED = 'project-created',
  PROJECT_DRAFTED = 'project-drafted',
  PROJECT_PUBLISHED = 'project-published',
  PROJECT_DRAFT_UPDATED = 'project-draft-updated',
  LEARNING_PATH_STARTED = 'learning-path-started',
  LEARNING_PATH_PROGRESS = 'learning-path-progress',
  LEARNING_PATH_COMPLETED = 'learning-path-completed',
  LEARNING_PATH_CONNECTED_TO_PROJECT = 'learning-path-connected-to-project',
  PROFILE_UPDATED = 'profile-updated',
  SETTINGS_UPDATED = 'settings-updated',
  PROJECT_JOINED = 'project-joined',
  PROJECT_LEFT = 'project-left',
  MEMBER_ROLE_APPLIED = 'member-role-applied',
  MEMBER_ROLE_APPROVED = 'member-role-approved',
  USER_INVITED_TO_PROJECT = 'user-invited-to-project',
  DISCUSSION_COMMENT_POSTED = 'discussion-comment-posted',
  DISCUSSION_COMMENT_REPLIED = 'discussion-comment-replied',
  TASK_CREATED = 'task-created',
  TASK_UPDATED = 'task-updated',
  TASK_DELETED = 'task-deleted',
  PROJECT_DETAILS_UPDATED = 'project-details-updated',
  PROJECT_PHOTO_UPDATED = 'project-photo-updated',
  PROJECT_VISIBILITY_UPDATED = 'project-visibility-updated',
}

export interface Event {
    id: string;
    type: EventType;
    payload?: any;
    createdAt: Timestamp | string;
    actorUserId: UserId;
    targetUserId?: UserId;
    projectId?: ProjectId;
}

export interface Notification {
    id: string;
    userId: UserId;
    eventId: string;
    isRead: boolean;
    createdAt: Timestamp | string;
}

export interface HydratedNotification extends Notification {
    event: Event;
    actor: User;
    targetUser?: User;
    project?: Project;
}

export enum ActivityType {
    ProjectCreated = 'project-created',
    ProjectStatusUpdated = 'project-status-updated',
    ProjectMemberAdded = 'project-member-added',
    ProjectMemberRoleUpdated = 'project-member-role-updated',
    TaskCreated = 'task-created',
    TaskStatusUpdated = 'task-status-updated',
    TaskAssigned = 'task-assigned',
    DiscussionPosted = 'discussion-posted',
}

// This defines the structure of the object returned by getUserActivity
export interface UserActivityPayload {
    projects: Project[];
    tasks: Task[];
    discussions: Discussion[];
    notifications: Notification[];
}


export interface Activity {
    id: string;
    type: ActivityType;
    actorId: UserId;
    timestamp: Timestamp | string;
    projectId?: ProjectId;
    context: {
        // Common context
        projectName?: string;

        // Context for project-related activities
        projectStatus?: Project['status'];
        newMemberId?: UserId;
        newMemberRole?: ProjectMember['role'];

        // Context for task-related activities
        taskId?: string;
        taskTitle?: string;
        taskStatus?: Task['status'];
        assigneeId?: UserId;

        // Context for discussion-related activities
        discussionId?: string;
    };
}

export interface SteemAccount {
    name: string;
    post_count: number;
    posting_json_metadata: string;
    reputation: string;
    voting_power: number;
    balance: string;
}

export interface SteemPost {
    post_id: number;
    author: string;
    permlink: string;
    category: string;
    title: string;
    body: string;
    json_metadata: string;
    created: string;
    last_update: string;
    active_votes: any[];
    net_votes: number;
    children: number;
    url: string;
    total_payout_value: string;
    curator_payout_value: string;
    pending_payout_value: string;
}
