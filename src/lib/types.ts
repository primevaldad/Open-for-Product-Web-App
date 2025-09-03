
import type { LucideIcon } from "lucide-react";

export type Notification = {
  id: string;
  message: string;
  link: string;
  read: boolean;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;
  bio?: string;
  interests?: string[];
  onboarded: boolean;
  notifications?: Notification[];
};

export type UserRole = 'lead' | 'participant';

export type ProjectMember = {
  user: User;
  role: UserRole;
  userId: string;
};

export type ProjectCategory = 'Creative' | 'Technical' | 'Community' | 'Business & Enterprise' | 'Learning & Research';

export type ProjectStatus = 'published' | 'draft';

export type Governance = {
    contributorsShare: number;
    communityShare: number;
    sustainabilityShare: number;
}

export type Discussion = {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  userId: string;
};

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ProjectCategory;
  timeline: string;
  contributionNeeds: string[];
  progress: number;
  team: Omit<ProjectMember, 'user'>[];
  votes: number;
  discussions: Omit<Discussion, 'user' | 'id'>[];
  isExpertReviewed?: boolean;
  status: ProjectStatus;
  governance?: Governance;
};

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
  category: ProjectCategory;
  duration: string;
  Icon: LucideIcon;
  isLocked?: boolean;
  modules: Module[];
};

export type UserLearningProgress = {
  userId: string;
  pathId: string;
  completedModules: string[]; // array of module ids
};

export type Interest = {
  id: string;
  name: string;
};
