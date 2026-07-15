import { z } from 'zod';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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
    photoUrl?: string;
    avatarUrl?: string; // New avatar URL field
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
    steemVerified?: boolean;
    steemVerificationCode?: string;
    steemFeedPreference?: 'all' | 'blog' | 'none';
    steemIconOverlay?: boolean;
    steemTestnetEnabled?: boolean;
    followedProjectIds?: string[];
    lastCommunityFeedSeenAt?: string;
    bypassOnboarding?: boolean;
    emailVerified?: boolean;
    // Timestamp of when verification email was last sent
    verificationEmailSentAt?: Timestamp | FieldValue;
}

export interface Project {
    id: ProjectId;
    name: string;
    photoUrl?: string;
    tagline: string;
    description: string;
    mission?: string;
    currentFocus?: string;
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
    embedding?: any; // VectorValue
    parentProjectId?: string; // For nested projects
    isCollection?: boolean; // Whether this project acts as a collection (has children)
    governanceConfig?: ProjectGovernanceConfig;
    fundry?: FundryConfig;
}

export interface Post {
    id: string;
    projectId: string;
    userId: string;
    title: string;
    content: string; // OfP-optimized markdown
    tags: string[];
    steemStatus: 'none' | 'pending' | 'confirmed' | 'failed';
    steemPermlink?: string;
    steemAuthor?: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    status?: 'draft' | 'published';
    // Soft-delete fields (published posts only)
    deletedAt?: string;
    deletedBy?: 'author' | 'admin' | 'system';
    // Edit tracking
    editedAt?: string;
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
    mission?: string;
    currentFocus?: string;
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
    embedding?: any; // VectorValue
    parentProjectId?: string; // For nested projects
    isCollection?: boolean; // Whether this project acts as a collection (has children)
    governanceConfig?: ProjectGovernanceConfig;
    fundry?: FundryConfig;
}

export interface HydratedProjectMember {
    user: User;
    userId: UserId;
    role: 'lead' | 'contributor' | 'participant';
    pendingRole?: 'lead' | 'contributor' | 'participant';
    createdAt?: Timestamp | string;
    updatedAt?: Timestamp | string;
}

export interface ProjectInvite {
    id: string;
    projectId: string;
    email: string;
    role: 'lead' | 'contributor' | 'participant';
    invitedBy: UserId;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    token: string;
    createdAt: Timestamp | string;
    expiresAt: Timestamp | string;
}

export interface ProjectMatchThread {
    id: string;
    email: string;
    status: 'open' | 'finalized' | 'archived' | 'expired';
    interests: string;
    contribution: string;
    notes?: string;
    leadMessage?: string;
    inviteEmailSnapshot?: string;
    internalNote?: string;
    requesterMessage?: string;
    requesterName?: string;
    tokenHash?: string | null;
    tokenIssuedAt?: Timestamp | string;
    tokenExpiresAt?: Timestamp | string;
    tokenConsumedAt?: Timestamp | string;
    lastAccessAt?: Timestamp | string;
    lastActivityAt?: Timestamp | string;
    finalizedAt?: Timestamp | string;
    archivedAt?: Timestamp | string;
    expiresAt?: Timestamp | string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
    createdByUserId?: string | null;
    updatedByUserId?: string | null;
}

export interface ProjectMatchMessage {
    id: string;
    threadId: string;
    senderType: 'requester' | 'admin' | 'system';
    senderUserId?: string | null;
    senderEmail?: string | null;
    body: string;
    kind?: 'message' | 'note' | 'system';
    createdAt: Timestamp | string;
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
    deletedAt?: string;
    deletedBy?: 'author' | 'admin' | 'system';
    editedAt?: string;
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
    sortOrder?: number;
    fundingGoalIds?: string[];
}

export interface HydratedTask extends Omit<Task, 'assignedToId'> {
    assignee?: User;
    fundingGoals?: { id: string; title: string }[];
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

export interface ProjectsPageData {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: GlobalTag[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
    suggestedProjects: HydratedProject[] | null;
    aiEnabled: boolean;
}

// --- ProjectsPageData (Refactored for consistency) ---
export type ProjectsPageDataSuccess = { success: true } & ProjectsPageData;
export interface ProjectsPageDataError {
    success: false;
    error: string;
}
export type ProjectsPageDataResponse = ProjectsPageDataSuccess | ProjectsPageDataError;

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
    INVITE_ACCEPTED = 'invite-accepted',
    INVITE_REJECTED = 'invite-rejected',
    DISCUSSION_COMMENT_EDITED = 'discussion-comment-edited',
    DISCUSSION_COMMENT_DELETED = 'discussion-comment-deleted',
    POST_EDITED = 'post-edited',
    POST_DELETED = 'post-deleted',
    // Collections
    COLLECTION_CREATED = 'collection-created',
    COLLECTION_UPDATED = 'collection-updated',
    COLLECTION_DELETED = 'collection-deleted',
    PROJECT_ADDED_TO_COLLECTION = 'project-added-to-collection',
    PROJECT_REMOVED_FROM_COLLECTION = 'project-removed-from-collection',
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
    CollectionCreated = 'collection-created',
    CollectionUpdated = 'collection-updated',
    CollectionDeleted = 'collection-deleted',
    CollectionProjectAdded = 'collection-project-added',
    CollectionProjectRemoved = 'collection-project-removed',
    SteemCommunityPost = 'steem-community-post',
    SteemBlogSync = 'steem-blog-sync',
    QueenActionProposed = 'queen-action-proposed',
    QueenActionApproved = 'queen-action-approved',
    QueenActionRejected = 'queen-action-rejected',
    JesterBriefGenerated = 'jester-brief-generated',
    ProjectMissionUpdated = 'project-mission-updated',
    ProjectFocusUpdated = 'project-focus-updated',
}

// This defines the structure of the object returned by getUserActivity
export interface UserActivityPayload {
    projects: Project[];
    tasks: Task[];
    discussions: Discussion[];
    notifications: Notification[];
}

export interface LogActivityParams {
    projectId?: string;
    collectionId?: string;
    actorId: string;
    type: ActivityType;
    context?: Record<string, any>;
}

export interface Activity {
    id: string;
    type: ActivityType;
    actorId: UserId;
    timestamp: Timestamp | string;
    projectId?: ProjectId;
    collectionId?: ProjectId;
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

        // Context for collection-related activities
        collectionId?: string;
        collectionName?: string;
        collectionSlug?: string;
        isProjectCollection?: boolean;

        // Context for Steem-related activities
        steemTitle?: string;
        steemUrl?: string;
        steemCommunity?: string;

        // Context for Queen/Jester activities
        queenActionId?: string;
        queenActionType?: string;
        jesterInsightId?: string;
    };
}

// --- Queen & Jester AI Types ---

export interface ContributorProfile {
    id: string;
    projectId: string;
    userId: string;
    goals?: string;
    skills?: string[];
    hoursPerWeek?: number;
    contributionStyle?: string;
    rawOnboardingJson?: Record<string, any>;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export type QueenActionStatus = 'pending_approval' | 'approved' | 'edited_then_approved' | 'rejected' | 'executed' | 'failed';

export interface QueenAction {
    id: string;
    projectId: string;
    type: string; // 'welcome_message', 'task_recommendation', 'outreach_draft', etc.
    status: QueenActionStatus;
    payload: Record<string, any>;
    computerCallId?: string;
    proposedAt: Timestamp | string;
    decidedAt?: Timestamp | string;
    decidedByUserId?: string;
    editsDiff?: Record<string, any>;
}

export interface JesterInsight {
    id: string;
    projectId: string;
    kind: string; // 'stalled_task', 'pattern_stabilizing', etc.
    summary: string;
    evidence: Record<string, any>;
    severity: 'info' | 'nudge' | 'warning';
    createdAt: Timestamp | string;
}

export interface AiCallLog {
    id: string;
    projectId?: string;
    queenActionId?: string;
    triggeredBy: 'queen' | 'jester' | 'user';
    promptTemplateId: string;
    promptFull: string;
    model: string;
    response: string;
    sources?: Record<string, any>[];
    creditsEstimated?: number;
    creditsActual?: number;
    status: 'ok' | 'partial' | 'error';
    createdAt: Timestamp | string;
}

export interface PlatformConfig {
    id: string; // e.g., 'global_settings'
    activeAiModel: string;
    defaultFeaturesEnabled: Record<string, boolean>;
    projectOverrides: Record<string, Record<string, boolean>>; // projectId -> feature flags
    adminUserIds: string[];
    defaultGovernance?: {
        decisionModel: DecisionModel;
        valueFlow: ValueFlowBucket[];
        financialSnapshot?: FinancialSnapshot;
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
    community_title?: string;
}

// --- Project Collections ---

/**
 * How projects are selected for this collection.
 * - 'manual'     — owner explicitly adds/removes project IDs
 * - 'tag-rule'   — future: auto-populated by matching tags (tagRule field)
 * - 'semantic'   — future: auto-populated by AI similarity (semanticQuery field)
 */
export type CollectionCurationMode = 'manual' | 'tag-rule' | 'semantic';

export interface ProjectCollection {
    id: string;

    /** Human-readable name, e.g. "Open for Product Family" */
    name: string;

    /** URL-friendly identifier, e.g. "open-for-product-family" — must be unique */
    slug: string;

    description: string;
    coverImageUrl?: string;

    /** User who created and manages this collection */
    ownerId: UserId;

    /**
     * - 'public'   — listed in /collections browse page
     * - 'unlisted' — accessible via direct link only (not listed)
     * - 'private'  — owner only
     */
    visibility: 'public' | 'unlisted' | 'private';

    curationMode: CollectionCurationMode;

    /**
     * The canonical list of project IDs in this collection.
     * For 'manual' mode: directly managed by the owner.
     * For 'tag-rule' / 'semantic': materialized cache (refreshed on demand).
     */
    memberProjectIds: ProjectId[];

    /** Used when curationMode = 'tag-rule' (future) */
    tagRule?: {
        tagIds: string[];
        matchAll: boolean;
    };

    /** Used when curationMode = 'semantic' (future) */
    semanticQuery?: string;

    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

/** ProjectCollection with the owner User hydrated */
export interface HydratedCollection extends Omit<ProjectCollection, 'ownerId'> {
    owner: User;
    /** Resolved project objects — subset of memberProjectIds that could be found */
    projects: HydratedProject[];
}

// --- Governance Configuration Models ---

export type GovernanceSource = 'inherited' | 'custom' | 'not_configured';

export type DecisionModel =
    | 'project_lead'
    | 'project_lead_advisory'
    | 'majority_vote'
    | 'consensus'
    | 'parent_inherited';

export interface ValueFlowBucket {
    id: string;
    label: string;
    percentage: number;
    description?: string;
}

export interface CooperativeDecision {
    id: string;
    title: string;
    status: 'draft' | 'scheduled' | 'approved' | 'rejected' | 'completed';
    date?: string;
}

export interface FinancialSnapshot {
    creditOnHand: number;
    neededForNextTasks: number;
    alreadyDedicated: number;
    remainingNeed: number;
}

export interface ProjectGovernanceConfig {
    source: GovernanceSource;
    parentProjectId?: string;
    parentProjectTitle?: string;
    decisionModel: DecisionModel;
    valueFlow: ValueFlowBucket[];
    lastDecision?: CooperativeDecision;
    nextDecision?: CooperativeDecision;
    financialSnapshot?: FinancialSnapshot;
    updatedAt?: string;
    updatedBy?: string;
}

// --- Fundry Models ---

export interface FundryConfig {
    enabled: boolean;
    mode: "planning" | "manual" | "live";
    fundingStatus: "not_started" | "open" | "paused" | "closed";

    creditSystem: {
        enabled: boolean;
        creditsPerAllocationWindow: number;
        allocationWindowDays: number;
        rollingLock: boolean;
        creditLabel: string;
        allowReallocationBeforeLock: boolean;
    };

    pool: {
        currency: "USD";

        confirmedAmount: number;
        pendingCollectionAmount: number;
        pledgedAmount: number;
        placeholderAmount: number;

        unallocatedConfirmedAmount: number;
        unallocatedPendingAmount: number;
    };

    valuation: {
        displayMode: "confirmed_only" | "confirmed_plus_pending" | "planning";
        currentCreditValue: number;
        totalActiveCredits: number;
        lastCalculatedAt: Timestamp | string | null;
    };

    settings: {
        allowParticipantAllocation: boolean;
        allowDelegation: boolean;
        requireLeadApprovalForSpending: boolean;
        allowSelfDirectedSpending: boolean;
    };

    payments: {
        paymentProcessorConnected: boolean;
        processorName: string | null;
        livePaymentsEnabled: boolean;
        manualContributionsEnabled: boolean;
    };
}

export interface FundryFundingGoal {
    id: string;
    projectId: string;

    title: string;
    description: string;

    category:
        | "tools"
        | "labor"
        | "marketing"
        | "research"
        | "operations"
        | "legal"
        | "community"
        | "other";

    minimumStartAmount: number;
    targetAmount: number;

    directedValue: number;
    lockedValue: number;
    confirmedValue: number;
    pendingValue: number;
    pledgedValue: number;
    placeholderValue: number;

    spentAmount: number;

    fundingStatus:
        | "unfunded"
        | "partially_directed"
        | "directed_pending_lock"
        | "funded_pending_collection"
        | "funded"
        | "overfunded"
        | "in_progress"
        | "completed";

    priority: "low" | "medium" | "high" | "critical";

    workStatus:
        | "not_started"
        | "ready"
        | "in_progress"
        | "blocked"
        | "completed"
        | "cancelled";

    visibility: "public" | "members" | "leads";

    createdBy: string;
    assignedOwnerId: string | null;

    dueDate: Timestamp | string | null;
    notes: string;

    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface FundryAllocation {
    id: string;
    projectId: string;
    goalId: string;
    poolId: string | "default";

    userId: string;

    creditsAllocated: number;

    allocatedAt: Timestamp | string;
    editableUntil: Timestamp | string;
    lockedAt: Timestamp | string | null;

    status:
        | "active"
        | "locked"
        | "superseded"
        | "cancelled"
        | "settled";

    estimatedValueAtAllocation: number;
    currentEstimatedValue: number;
    lockedValue: number | null;

    note: string;

    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface FundryContribution {
    id: string;
    projectId: string;

    contributorId: string | null;
    contributorName: string;
    contributorEmail?: string | null;

    amount: number;
    currency: "USD";

    contributionType:
        | "placeholder"
        | "pledge"
        | "pending_collection"
        | "manual"
        | "processor";

    status:
        | "placeholder"
        | "pledged"
        | "pending_collection"
        | "confirmed"
        | "cancelled"
        | "refunded"
        | "pending_checkout"
        | "pending_confirmation"
        | "failed"
        | "disputed";

    paymentProcessor: null | "stripe" | "paypal" | "square" | "other";
    processor?: "square" | null;
    externalReferenceId: string | null;
    goalId?: string | null;

    // Square specific properties
    squarePaymentLinkId?: string | null;
    squareOrderId?: string | null;
    squarePaymentId?: string | null;
    squareCheckoutUrl?: string | null;

    processorStatus?: string | null;
    processorReferenceId?: string | null;

    refundedAmount?: number;
    refundIds?: string[];
    disputeIds?: string[];

    idempotencyKey?: string;

    note: string;

    createdAt: Timestamp | string;
    updatedAt?: Timestamp | string;
    confirmedAt: Timestamp | string | null;
    lastProcessorEventAt?: Timestamp | string | null;
}

export interface FundryLedgerEntry {
    id: string;
    projectId: string;

    entryType:
        | "fundry_enabled"
        | "funding_goal_created"
        | "funding_goal_updated"
        | "contribution_created"
        | "contribution_confirmed"
        | "credits_allocated"
        | "allocation_updated"
        | "allocation_locked"
        | "funds_spent"
        | "manual_adjustment";

    amount: number;
    currencyOrCredit: "USD" | "FUND_CREDIT";

    fromUserId: string | null;
    toUserId: string | null;
    goalId: string | null;
    allocationId: string | null;
    contributionId: string | null;

    description: string;

    createdBy: string | "system";
    createdAt: Timestamp | string;
}
