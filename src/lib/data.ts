
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { rawUsers, rawProjects, rawTasks, rawLearningPaths as rawLPs, rawProgress, rawInterests } from './raw-data';

const iconMap: { [key: string]: LucideIcon } = {
    Code,
    BookText,
    UsersIcon,
    Handshake,
    Briefcase,
    FlaskConical,
};

// Hydrate data on initial load
export const users: User[] = rawUsers.map(u => ({ ...u, onboarded: u.onboarded ?? true }));

export const projects: Project[] = rawProjects.map((p: any) => ({
    ...p,
    team: p.team.map((m: any) => ({
        user: users.find(u => u.id === m.user)!,
        role: m.role
    }))
}));

export const tasks: Task[] = rawTasks.map((t: any) => ({
    ...t,
    assignedTo: t.assignedTo ? users.find(u => u.id === t.assignedTo) : undefined,
}));

export const learningPaths: LearningPath[] = rawLPs.map(p => ({
    ...p,
    Icon: iconMap[p.Icon] || FlaskConical,
}));

// Re-export raw data for use in the cache serialization
export { rawUsers, rawProjects, rawTasks, rawLPs as rawLearningPaths, rawProgress, rawInterests };


export const currentUserLearningProgress: UserLearningProgress[] = rawProgress;
export const interests: Interest[] = rawInterests;

export const projectCategories = [
    { name: 'Creative', icon: Code },
    { name: 'Technical', icon: BookText },
    { name: 'Community', icon: UsersIcon },
    { name: 'Business & Enterprise', icon: Briefcase },
    { name: 'Learning & Research', icon: FlaskConical },
] as const;

// This will be managed by the data-cache
export let currentUser: User = users[0];
