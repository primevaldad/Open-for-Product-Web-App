
import type { ProfileTag } from './types';
import { Code, BookText, Users as UsersIcon, Briefcase, FlaskConical, type LucideIcon } from 'lucide-react';

export type ProjectCategory = 'Creative' | 'Technical' | 'Community' | 'Business & Enterprise' | 'Learning & Research';

// This file contains static data that is safe to be shared between server and client components.

export const interests: ProfileTag[] = [
    { "id": "i1", "display": "UI/UX Design" },
    { "id": "i2", "display": "Frontend Development" },
    { "id": "i3", "display": "Backend Development" },
    { "id": "i4", "display": "DevOps" },
    { "id": "i5", "display": "Product Management" },
    { "id": "i6", "display": "Marketing" },
    { "id": "i7", "display": "Community Management" },
    { "id": "i8", "display": "Graphic Design" },
    { "id": "i9", "display": "Content Writing" },
    { "id": "i10", "display": "Data Science" }
];

export const projectCategories = [
    { name: 'Creative', icon: Code },
    { name: 'Technical', icon: BookText },
    { name: 'Community', icon: UsersIcon },
    { name: 'Business & Enterprise', icon: Briefcase },
    { name: 'Learning & Research', icon: FlaskConical },
] as const;

export const iconMap: Record<ProjectCategory, LucideIcon> = {
    'Creative': Code,
    'Technical': BookText,
    'Community': UsersIcon,
    'Business & Enterprise': Briefcase,
    'Learning & Research': FlaskConical,
};
