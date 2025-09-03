
import type { User, Project, Task, LearningPath, UserLearningProgress, Interest, Module, ProjectCategory } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';


export const mockUsers: User[] = [
    {
        id: 'u1',
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
        avatarUrl: 'https://picsum.photos/id/1005/100/100',
        bio: 'Creative full-stack developer with a passion for building beautiful and functional user experiences. Eager to contribute to open-source and learn from a diverse community.',
        interests: ['UI/UX Design', 'Frontend Development', 'Community Management'],
        onboarded: true,
        notifications: [
            { id: 'n1', message: 'You have been assigned a new task in "Community Art Mural".', link: '/projects/p1', read: true },
            { id: 'n2', message: 'Your design for the landing page was approved.', link: '#', read: false }
        ]
    },
    {
        id: 'u2',
        name: 'Sam Smith',
        email: 'sam.smith@example.com',
        avatarUrl: 'https://picsum.photos/id/1012/100/100',
        bio: 'Backend engineer focused on scalable systems and data architecture. Loves tackling complex problems and mentoring junior developers.',
        interests: ['Backend Development', 'Data Science', 'DevOps'],
        onboarded: true,
        notifications: []
    },
    {
        id: 'u3',
        name: 'Jordan Lee',
        email: 'jordan.lee@example.com',
        avatarUrl: 'https://picsum.photos/id/1027/100/100',
        bio: 'Product manager with a knack for turning great ideas into successful products. Believes in user-centric design and agile methodologies.',
        interests: ['Product Management', 'Marketing', 'UI/UX Design'],
        onboarded: false,
        notifications: []
    }
];

export const mockProjects: Project[] = [
    {
        id: 'p1',
        name: 'Community Art Mural',
        tagline: 'A collaborative digital mural for social good.',
        description: 'This project aims to create a large-scale, interactive digital mural where people from around the world can contribute a pixel of art. The final piece will be auctioned as an NFT to raise money for charity.',
        category: 'Creative',
        timeline: '3 Months',
        contributionNeeds: ['UI/UX Design', 'React', 'Firebase'],
        progress: 75,
        team: [{ userId: 'u1', role: 'lead' }, { userId: 'u2', role: 'participant' }],
        votes: 128,
        discussions: [
            { id: 'd1', userId: 'u1', content: 'Initial mockups for the landing page are ready for review!', timestamp: new Date('2023-10-26T10:00:00Z').toISOString() },
            { id: 'd2', userId: 'u2', content: "Great! I'll start setting up the Firestore schema for the pixel data.", timestamp: new Date('2023-10-26T12:30:00Z').toISOString() }
        ],
        isExpertReviewed: true,
        status: 'published',
        governance: { contributorsShare: 70, communityShare: 15, sustainabilityShare: 15 }
    },
    {
        id: 'p2',
        name: 'AI-Powered Learning Assistant',
        tagline: 'Personalized learning paths using generative AI.',
        description: 'An intelligent tutor that adapts to your learning style. This project leverages Genkit and large language models to create dynamic and engaging educational content based on user goals and progress.',
        category: 'Technical',
        timeline: '6 Months',
        contributionNeeds: ['AI/ML', 'Next.js', 'Python', 'Genkit'],
        progress: 40,
        team: [{ userId: 'u2', role: 'lead' }],
        votes: 256,
        discussions: [],
        status: 'published',
        governance: { contributorsShare: 80, communityShare: 10, sustainabilityShare: 10 }
    },
    {
        id: 'p3',
        name: 'Neighborhood Tool Library',
        tagline: 'Share tools and build community.',
        description: "A web app for neighbors to list tools they're willing to lend and to borrow tools from others. The goal is to reduce waste, save money, and foster local connections.",
        category: 'Community',
        timeline: '4 Months',
        contributionNeeds: ['Marketing', 'Community Management', 'React'],
        progress: 15,
        team: [{ userId: 'u1', role: 'participant' }],
        votes: 98,
        discussions: [],
        status: 'published',
    },
    {
        id: 'p4',
        name: 'Indie Startup Launchpad',
        tagline: 'From idea to MVP with community support.',
        description: 'A platform that provides resources, mentorship, and a structured path for entrepreneurs to launch their startups. Projects get feedback and support from a community of builders.',
        category: 'Business & Enterprise',
        timeline: 'Ongoing',
        contributionNeeds: ['Product Management', 'Venture Capital', 'Marketing'],
        progress: 5,
        team: [{ userId: 'u2', role: 'participant' }, { userId: 'u3', role: 'participant' }],
        votes: 45,
        discussions: [],
        status: 'draft',
    }
];

export const mockTasks: Task[] = [
    { id: 't1', projectId: 'p1', title: 'Design landing page mockups', status: 'Done', assignedToId: 'u1', estimatedHours: 10 },
    { id: 't2', projectId: 'p1', title: 'Set up Firestore database', status: 'In Progress', assignedToId: 'u2', estimatedHours: 8 },
    { id: 't3', projectId: 'p1', title: 'Develop pixel grid component', status: 'To Do', estimatedHours: 16 },
    { id: 't4', projectId: 'p2', title: 'Fine-tune the Genkit flow for personalized content', status: 'In Progress', assignedToId: 'u2', estimatedHours: 20 },
    { id: 't5', projectId: 'p3', title: 'Create marketing materials for launch', status: 'To Do', assignedToId: 'u1' },
    { id: 't6', projectId: 'p3', title: 'User account and inventory system', status: 'To Do', assignedToId: 'u3', estimatedHours: 24 },
];

const designModules: Module[] = [
    { id: 'm1', title: 'Intro to Human-Centered Design', description: 'Learn the core principles of designing for people.', content: 'This module covers empathy maps, user personas, and journey mapping.' },
    { id: 'm2', title: 'Figma Fundamentals', description: 'Master the essential tools in Figma for UI design.', content: 'Topics include frames, components, auto layout, and prototyping.', videoUrl: 'https://www.youtube.com/embed/eZJOSK4gXl4' },
    { id: 'm3', title: 'Design Systems Thinking', description: 'Understand how to build and use a scalable design system.', content: 'Learn about design tokens, component libraries, and documentation.' }
];

const devModules: Module[] = [
    { id: 'm4', title: 'Modern React (Hooks & State)', description: 'Deep dive into modern React development patterns.', content: 'This module covers useState, useEffect, useContext, and custom hooks for managing complex state.' },
    { id: 'm5', title: 'Intro to Server Actions', description: 'Learn how to use Next.js Server Actions for data mutations.', content: 'Explore progressive enhancement and how server actions simplify your architecture.', videoUrl: 'https://www.youtube.com/embed/dDp6g_1h2wA' },
    { id: 'm6', title: 'Advanced Tailwind CSS', description: 'Go beyond the basics of Tailwind CSS.', content: 'Learn about theming, plugins, and performance optimization techniques.' }
];

export const mockLearningPaths: Omit<LearningPath, 'Icon'>[] = [
    { id: 'lp1', title: 'UI/UX Design for Impact', description: 'Learn design principles by contributing to real-world projects.', category: 'Creative', duration: '3 Months', modules: designModules },
    { id: 'lp2', title: 'Next.js Full-Stack Developer', description: 'Master the App Router, Server Actions, and more.', category: 'Technical', duration: '4 Months', modules: devModules },
    { id: 'lp3', title: 'Community Management & Growth', description: 'Build and nurture thriving online communities.', category: 'Community', duration: '2 Months', isLocked: true, modules: [] },
];

export const mockUserLearningProgress: UserLearningProgress[] = [
    { userId: 'u1', pathId: 'lp1', completedModules: ['m1'] },
    { userId: 'u2', pathId: 'lp2', completedModules: ['m4'] }
];
