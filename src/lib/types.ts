
import type { LucideIcon } from "lucide-react";

export type Notification = {
  id: string;
  userId: string;
  message: string;
  link: string;
  read: boolean;
  timestamp: string; // ISO 8601 format
};

export type User = {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;
  bio?: string;
  interests?: string[];
  onboarded: boolean;
  createdAt?: string;
  lastLogin?: string;
};

export const ROLES = ["lead", "contributor", "participant"] as const;
export type UserRole = typeof ROLES[number];

export type ProjectMember = {
  userId: string;
  role: UserRole;
  user?: User; // Populated for display, not stored in DB
};

export type ProjectStatus = 'published' | 'draft';

export type Governance = {
    contributorsShare: number;
    communityShare: number;
    sustainabilityShare: number;
}

export type Discussion = {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  timestamp: string; // ISO 8601 format
};

export type Tag = {
  id: string;
  normalized: string;
  display: string;
  type: 'category' | 'relational';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  usageCount?: number;
};

export type ProjectTag = {
  id: string;
  display: string;
  role: 'category' | 'relational';
};

export type SelectableTag = Tag & {
  isSelected: boolean;
};

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  timeline: string;
  contributionNeeds: string[];
  progress: number;
  team: ProjectMember[];
  votes: number;
  isExpertReviewed?: boolean;
  status: ProjectStatus;
  governance?: Governance;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  tags?: ProjectTag[];
  fallbackSuggestion?: string; // A pre-written suggestion for when the AI fails
};

export type ProjectPathLink = {
    id: string;
    projectId: string;
    learningPathId: string;
};

export type ProjectBadgeLink = {
    id: string;
    projectId: string;
    badgeId: string;
    isRequirement: boolean;
}

export type Badge = {
    id: string;
    name: string;
    learningPathId: string;
    moduleIds: string[];
}

export type UserBadge = {
    id: string;
    userId: string;
    badgeId: string;
    earnedAt: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: User;
  assignedToId?: string;
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Module = {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  content: string;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  duration: string;
  Icon: LucideIcon;
  isLocked?: boolean;
  modules: Module[];
};

export type UserLearningProgress = {
  userId: string;
  pathId: string;
  completedModules: string[];
};

export type Interest = {
  id: string;
  name: string;
};
