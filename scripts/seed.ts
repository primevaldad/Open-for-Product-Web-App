
// Use with `npx tsx scripts/seed.ts`
import 'dotenv/config';
import { db } from '../src/lib/firebase';
import { collection, writeBatch } from 'firebase/firestore';
import type { User, Project, Task, LearningPath, UserLearningProgress } from '../src/lib/types';

const interests = [
    { "id": "i1", "name": "UI/UX Design" },
    { "id": "i2", "name": "Frontend Development" },
    { "id": "i3", "name": "Backend Development" },
    { "id": "i4", "name": "DevOps" },
    { "id": "i5", "name": "Product Management" },
    { "id": "i6", "name": "Marketing" },
    { "id": "i7", "name": "Community Management" },
    { "id": "i8", "name": "Graphic Design" },
    { "id": "i9", "name": "Content Writing" },
    { "id": "i10", "name": "Data Science" }
];

const mockUsers: User[] = [
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

const mockProjects: Omit<Project, 'team' | 'discussions'>[] = [
    {
        id: 'p1',
        name: 'Community Art Mural',
        tagline: 'A collaborative digital mural for social good.',
        description: 'This project aims to create a large-scale, interactive digital mural where people from around the world can contribute a pixel of art. The final piece will be auctioned as an NFT to raise money for charity.',
        category: 'Creative',
        timeline: '3 Months',
        contributionNeeds: ['UI/UX Design', 'React', 'Firebase'],
        progress: 75,
        votes: 128,
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
        votes: 256,
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
        votes: 98,
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
        votes: 45,
        status: 'draft',
    }
];

const mockProjectRelations = {
    p1: {
        team: [{ userId: 'u1', role: 'lead' }, { userId: 'u2', role: 'participant' }],
        discussions: [
            { userId: 'u1', content: 'Initial mockups for the landing page are ready for review!', timestamp: new Date('2023-10-26T10:00:00Z').toISOString() },
            { userId: 'u2', content: "Great! I'll start setting up the Firestore schema for the pixel data.", timestamp: new Date('2023-10-26T12:30:00Z').toISOString() }
        ]
    },
    p2: { team: [{ userId: 'u2', role: 'lead' }], discussions: [] },
    p3: { team: [{ userId: 'u1', role: 'participant' }], discussions: [] },
    p4: { team: [{ userId: 'u2', role: 'participant' }, { userId: 'u3', role: 'participant' }], discussions: [] }
};


const mockTasks: Task[] = [
    { id: 't1', projectId: 'p1', title: 'Design landing page mockups', status: 'Done', assignedToId: 'u1', estimatedHours: 10 },
    { id: 't2', projectId: 'p1', title: 'Set up Firestore database', status: 'In Progress', assignedToId: 'u2', estimatedHours: 8 },
    { id: 't3', projectId: 'p1', title: 'Develop pixel grid component', status: 'To Do', estimatedHours: 16 },
    { id: 't4', projectId: 'p2', title: 'Fine-tune the Genkit flow for personalized content', status: 'In Progress', assignedToId: 'u2', estimatedHours: 20 },
    { id: 't5', projectId: 'p3', title: 'Create marketing materials for launch', status: 'To Do', assignedToId: 'u1' },
    { id: 't6', projectId: 'p3', title: 'User account and inventory system', status: 'To Do', assignedToId: 'u3', estimatedHours: 24 },
];

const designModules = [
    { id: 'm1', title: 'Intro to Human-Centered Design', description: 'Learn the core principles of designing for people.', content: 'This module covers empathy maps, user personas, and journey mapping.' },
    { id: 'm2', title: 'Figma Fundamentals', description: 'Master the essential tools in Figma for UI design.', content: 'Topics include frames, components, auto layout, and prototyping.', videoUrl: 'https://www.youtube.com/embed/eZJOSK4gXl4' },
    { id: 'm3', title: 'Design Systems Thinking', description: 'Understand how to build and use a scalable design system.', content: 'Learn about design tokens, component libraries, and documentation.' }
];

const devModules = [
    { id: 'm4', title: 'Modern React (Hooks & State)', description: 'Deep dive into modern React development patterns.', content: 'This module covers useState, useEffect, useContext, and custom hooks for managing complex state.' },
    { id: 'm5', title: 'Intro to Server Actions', description: 'Learn how to use Next.js Server Actions for data mutations.', content: 'Explore progressive enhancement and how server actions simplify your architecture.', videoUrl: 'https://www.youtube.com/embed/dDp6g_1h2wA' },
    { id: 'm6', title: 'Advanced Tailwind CSS', description: 'Go beyond the basics of Tailwind CSS.', content: 'Learn about theming, plugins, and performance optimization techniques.' }
];

const mockLearningPaths: Omit<LearningPath, 'Icon'>[] = [
    { id: 'lp1', title: 'UI/UX Design for Impact', description: 'Learn design principles by contributing to real-world projects.', category: 'Creative', duration: '3 Months', modules: designModules },
    { id: 'lp2', title: 'Next.js Full-Stack Developer', description: 'Master the App Router, Server Actions, and more.', category: 'Technical', duration: '4 Months', modules: devModules },
    { id: 'lp3', title: 'Community Management & Growth', description: 'Build and nurture thriving online communities.', category: 'Community', duration: '2 Months', isLocked: true, modules: [] },
];

const mockUserLearningProgress: UserLearningProgress[] = [
    { userId: 'u1', pathId: 'lp1', completedModules: ['m1'] },
    { userId: 'u2', pathId: 'lp2', completedModules: ['m4'] }
];

async function seedDatabase() {
    console.log('Starting to seed the database...');
    const batch = writeBatch(db);

    // Seed users
    const usersRef = collection(db, 'users');
    mockUsers.forEach(user => {
        const { id, ...userData } = user;
        batch.set(usersRef.doc(id), userData);
    });
    console.log('Users prepared for batch.');

    // Seed projects
    const projectsRef = collection(db, 'projects');
    mockProjects.forEach(project => {
        const { id, ...projectData } = project;
        const relations = mockProjectRelations[id as keyof typeof mockProjectRelations];
        batch.set(projectsRef.doc(id), {...projectData, ...relations});
    });
    console.log('Projects prepared for batch.');

    // Seed tasks
    const tasksRef = collection(db, 'tasks');
    mockTasks.forEach(task => {
        const { id, ...taskData } = task;
        batch.set(tasksRef.doc(id), taskData);
    });
    console.log('Tasks prepared for batch.');

    // Seed learning paths
    const learningPathsRef = collection(db, 'learningPaths');
    mockLearningPaths.forEach(path => {
        const { id, ...pathData } = path;
        batch.set(learningPathsRef.doc(id), pathData);
    });
    console.log('Learning paths prepared for batch.');

    // Seed user learning progress
    const userLearningProgressRef = collection(db, 'userLearningProgress');
    mockUserLearningProgress.forEach(progress => {
        const docId = `${progress.userId}_${progress.pathId}`;
        batch.set(userLearningProgressRef.doc(docId), progress);
    });
    console.log('User learning progress prepared for batch.');
    
    // Seed interests
    const interestsRef = collection(db, 'interests');
    interests.forEach(interest => {
        const { id, ...interestData } = interest;
        batch.set(interestsRef.doc(id), interestData);
    });
    console.log('Interests prepared for batch.');


    try {
        await batch.commit();
        console.log('Database successfully seeded!');
    } catch (error) {
        console.error('Error seeding database: ', error);
    }
}

seedDatabase();
