
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
    username: string;
    email: string;
    role?: string; // Can be 'guest' or undefined for regular users
    avatarUrl?: string;
    interests?: string[];
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
    ownerId: UserId;
    team: ProjectMember[];
    status: 'draft' | 'published' | 'archived';
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
    type: 'category' | 'relational' | 'custom'; 
}


// This represents a globally available tag that can be added to projects.
export interface Tag {
    id: string;
    normalized: string;
    display: string;
    type: 'category' | 'relational' | 'custom'; 
    usageCount: number;
    createdAt: Timestamp | string; 
    updatedAt: Timestamp | string; 
    createdBy: UserId;
}

export interface ProjectMember {
    userId: UserId;
    role: 'lead' | 'contributor' | 'participant';
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
    owner: User;
    team: HydratedProjectMember[];
    status: 'draft' | 'published' | 'archived';
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
}

export interface Discussion {
    id: string;
    projectId: ProjectId;
    userId: UserId;
    content: string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface Task {
    id: string;
    projectId: ProjectId;
    title: string;
    description: string;
    status: 'To Do' | 'In Progress' | 'Done' | 'Archived';
    createdBy: UserId;
    assignedToId?: UserId;
    estimatedHours?: number;
    dueDate?: Timestamp | string;
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}

export interface HydratedTask extends Omit<Task, 'assignedToId'> {
    assignee?: User;
}

export interface Notification {
    id: string;
    userId: UserId;
    message: string;
    link?: string;
    read: boolean;
    timestamp: Timestamp | string;
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
    userId: UserId;
    pathId: string;
    completedModules: string[];
    lastAccessed: Timestamp | string;
}


// --- Server Action Responses ---

export interface ServerActionResponse<T = any> {
    success: boolean;
    error?: string;
    data?: T;
}

// --- Discriminated Union Types for Page Data Responses ---

export type CreateProjectPageDataResponse = 
    | { success: true; allTags: Tag[]; allUsers: User[] }
    | { success: false; error: string };

export type EditProjectPageDataResponse = 
    | { success: true; project: HydratedProject; allTags: Tag[]; allUsers: User[] }
    | { success: false; error: string };

export type DraftsPageDataResponse = 
    | { success: true; drafts: HydratedProject[]; allLearningPaths: LearningPath[]; allProjectPathLinks: ProjectPathLink[] }
    | { success: false; error: string };
