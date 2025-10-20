
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
    email: string;
    avatarUrl?: string;
    interests?: string[];
    bio?: string;
    draftProjects?: ProjectId[]; // IDs of projects the user is drafting
    onboardingCompleted: boolean;
}

export interface Project {
    id: ProjectId;
    name: string;
    photoUrl?: string;
    tagline: string;
    description: string;
    createdAt: Timestamp | string; 
    updatedAt: Timestamp | string; 
    ownerId: UserId;
    team: ProjectMember[];
    status: 'draft' | 'published' | 'archived';
    // Tags are now required to be an array of ProjectTag objects
    tags: ProjectTag[];
    contributionNeeds: string[];
    // A fallback suggestion to be shown if AI suggestions fail
    fallbackSuggestion?: string;
    // New governance model
    governance?: {
        contributorsShare: number; // Percentage of ownership for contributors
        communityShare: number;    // Percentage of ownership for the community
        sustainabilityShare: number; // Percentage for project sustainability
    };
    // Progress percentage
    progress?: number;
}

// This represents a tag that is associated with a project.
export interface ProjectTag {
    id: string;
    display: string;
    // The type helps categorize the tag, e.g., for filtering or display logic.
    type: 'category' | 'relational' | 'custom'; 
}


// This represents a globally available tag that can be added to projects.
export interface Tag {
    id: string;
    display: string;
    type: 'category' | 'relational'; 
    // A count of how many times the tag has been used across all projects.
    usageCount: number;
}

export interface ProjectMember {
    userId: UserId;
    role: 'lead' | 'contributor' | 'participant';
}

export interface HydratedProject extends Omit<Project, 'team' | 'ownerId'> {
    owner: User;
    team: HydratedProjectMember[];
}

export interface HydratedProjectMember {
    user: User;
    role: 'lead' | 'contributor' | 'participant';
}

export interface Discussion {
    id: string;
    projectId: ProjectId;
    userId: UserId;
    timestamp: Timestamp | string;
    content: string;
}

export interface Task {
    id: string;
    projectId: ProjectId;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done' | 'archived';
    createdBy: UserId;
    assignee?: UserId;
    dueDate?: Timestamp | string;
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
    // An array of Module objects that make up the learning path.
    modules: Module[];
    createdAt: Timestamp | string;
    updatedAt: Timestamp | string;
}
  
export interface Module {
    moduleId: string;
    title: string;
    // Type of content, which can be used to determine how to render the module.
    contentType: 'video' | 'article' | 'quiz' | 'code-challenge';
    // URL or reference to the content for the module.
    contentUrl: string; 
    // Estimated time to complete the module, in minutes.
    duration: number; 
}

// Represents the progress of a user on a specific learning path.
export interface UserLearningProgress {
    userId: UserId;
    pathId: string;
    // A map where the key is the moduleId and the value is the completion status.
    completedModules: Record<string, boolean>;
    // The last time the user made progress on this path.
    lastAccessed: Timestamp | string;
}


// --- Server Action Responses ---

export interface ServerActionResponse {
    success: boolean;
    error?: string;
}
