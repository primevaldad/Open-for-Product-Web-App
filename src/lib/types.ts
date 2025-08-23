import type { LucideIcon } from "lucide-react";

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  bio?: string;
};

export type UserRole = 'lead' | 'participant';

export type ProjectMember = {
  user: User;
  role: UserRole;
};

export type ProjectCategory = 'Creative' | 'Technical' | 'Community' | 'Business & Enterprise' | 'Learning & Research';

export type ProjectStatus = 'published' | 'draft';

export type Governance = {
    contributorsShare: number;
    communityShare: number;
    sustainabilityShare: number;
}

export type Project = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ProjectCategory;
  timeline: string;
  contributionNeeds: string[];
  progress: number;
  team: ProjectMember[];
  votes: number;
  discussions: number;
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
  estimatedHours?: number;
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  Icon: LucideIcon;
  isLocked?: boolean;
};
