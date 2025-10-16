
import type { LucideIcon } from "lucide-react";

// -------------------- Notifications --------------------
export type Notification = {
  id: string;
  userId: string;
  message: string;
  link: string;
  read: boolean;
  timestamp: string; // ISO 8601 format
};

// -------------------- Users --------------------
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
  notifications?: Notification[];
};

export const ROLES = ["lead", "contributor", "participant"] as const;
export type UserRole = typeof ROLES[number];

// -------------------- Projects --------------------
export type ProjectMember = {
  userId: string;
  role: UserRole;
  user?: User; // Populated for display
};

export type HydratedProjectMember = ProjectMember & { user: User };

export type ProjectStatus = 'published' | 'draft';

export type Governance = {
  contributorsShare: number;
  communityShare: number;
  sustainabilityShare: number;
};

export type ProjectTag = {
  id: string;
  display: string;
  role: 'category' | 'relational';
  createdAt?: string;
  updatedAt?: string;
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
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: ProjectTag[];
  fallbackSuggestion?: string;
};

export type HydratedProject = Omit<Project, 'team'> & {
  team: HydratedProjectMember[];
};

// -------------------- Discussions --------------------
export type Discussion = {
    id: string;
    projectId: string;
    userId: string;
    content: string;
    timestamp: string; // ISO 8601 format
};

// -------------------- Tasks --------------------
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

// -------------------- Learning --------------------
export type Module = {
  moduleId: string;
  title: string;
  description: string;
  videoUrl?: string;
  content: string;
};

export type LearningPath = {
  pathId: string;
  title: string;
  description: string;
  duration: string;
  category: string; 
  Icon: LucideIcon;
  isLocked?: boolean;
  modules: Module[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserLearningProgress = {
  userId: string;
  pathId: string;
  completedModules: string[];
};

// -------------------- Badges --------------------
export type Badge = {
  id: string;
  name: string;
  learningPathId: string;
  moduleIds: string[];
};

export type UserBadge = {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
};

// -------------------- Misc --------------------
export type Interest = {
  id: string;
  name: string;
};

// -------------------- Link Types --------------------
export type ProjectPathLink = {
  pathId: string;
  projectId: string;
  learningPathId: string;
};

export type ProjectBadgeLink = {
  id: string;
  projectId: string;
  badgeId: string;
  isRequirement: boolean;
};

// -------------------- Activity Page Props --------------------
export interface CompletedModuleData {
  path: { pathId: string; title: string };
  module: Module;
}

export type TaskFormValues = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedToId?: string;
  estimatedHours?: number;
};

// Define a standard return type for server actions
export type ServerActionResponse<T = unknown> = 
  | { success: true; data?: T }
  | { success: false; error: string };

export interface ActivityClientPageProps {
  currentUser: User; // Added currentUser
  myTasks: Task[];
  completedModulesData: CompletedModuleData[];
  projects: Project[];
  updateTask: (values: TaskFormValues) => Promise<ServerActionResponse>;
  deleteTask: (values: { id: string; projectId: string; }) => Promise<ServerActionResponse>;
}
