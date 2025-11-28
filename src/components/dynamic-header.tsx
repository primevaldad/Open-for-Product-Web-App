"use client";

import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/page-header';

// A simple function to capitalize the first letter of a string
const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) {
        return '';
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// A function to generate a title from the pathname
const generateTitle = (pathname: string): string => {
    // Split the path by slashes and remove empty segments that may result from a leading slash
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) return 'Home';

    const primarySegment = segments[0];

    switch (primarySegment) {
        case 'home':
            return 'Home';
        case 'activity':
            return 'Activity';
        case 'drafts':
            return 'My Drafts';
        case 'learning':
            if (segments.length > 2) return 'Learning Module';
            if (segments.length > 1) return 'Learning Path';
            return 'Learning';
        case 'profile':
            return 'Profile';
        case 'settings':
            return 'Settings';
        case 'resources':
            return 'Resources';
        case 'create':
            return 'Create Project';
        case 'projects':
            if (segments.length > 2 && segments[2] === 'edit') return 'Edit Project';
            if (segments.length > 1) return 'Project Details';
            return 'Projects';
        default:
            return capitalize(primarySegment);
    }
};

export function DynamicHeader() {
    const pathname = usePathname();
    const title = generateTitle(pathname);

    return <PageHeader title={title} />;
}
