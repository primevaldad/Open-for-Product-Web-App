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
};

export type Task = {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignedTo?: User;
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
