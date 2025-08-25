
import type { Project, Task, User, UserLearningProgress, Interest } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import * as dataModule from '@/lib/data';

// This is a server-side only file.
// Do not import it into client components.

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');
const ENCODING = 'utf-8';

interface AppData {
    users: User[];
    projects: Project[];
    tasks: Task[];
    learningPaths: any[];
    currentUserLearningProgress: UserLearningProgress[];
    interests: Interest[];
    currentUserIndex: number;
    currentUser: User;
}

let dataCache: AppData | null = null;
let writeTimeout: NodeJS.Timeout | null = null;

function serializeContent(data: AppData): string {
    // Make a deep copy to avoid modifying the original data during serialization
    const dataToSerialize = JSON.parse(JSON.stringify(data));

    const usersString = JSON.stringify(dataToSerialize.users.map((u: User) => ({...u, interests: u.interests || []})), null, 2);

    const projectsToSave = dataToSerialize.projects.map((p: Project) => ({
        ...p,
        team: p.team.map(m => ({ user: m.user.id, role: m.role }))
    }));
    const projectsString = JSON.stringify(projectsToSave, null, 2);

    const tasksToSave = dataToSerialize.tasks.map((t: Task) => ({
        ...t,
        assignedTo: t.assignedTo?.id
    }));
    const tasksString = JSON.stringify(tasksToSave, null, 2);

    const progressString = JSON.stringify(dataToSerialize.currentUserLearningProgress, null, 2);
    const interestsString = JSON.stringify(dataToSerialize.interests, null, 2);

    return `
import type { Project, Task, User, UserLearningProgress, ProjectCategory, Interest } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LearningPath } from './types';

// Raw data, to be hydrated by getData
const rawUsers: Omit<User, 'onboarded'>[] = ${usersString.replace(/"([^"]+)":/g, '$1:')};
const rawProjects = ${projectsString.replace(/"([^"]+)":/g, '$1:')};
const rawTasks = ${tasksString.replace(/"([^"]+)":/g, '$1:')};
const rawProgress: UserLearningProgress[] = ${progressString.replace(/"([^"]+)":/g, '$1:')};

export const users: User[] = rawUsers.map(u => ({ ...u, onboarded: u.onboarded ?? false }));

export let currentUser: User = users[${data.currentUserIndex}];

export const projects: Project[] = rawProjects.map((p: any) => ({
    ...p,
    team: p.team.map((m: any) => ({
        user: users.find(u => u.id === m.user)!,
        role: m.role
    }))
}));

export let tasks: Task[] = rawTasks.map((t: any) => ({
    ...t,
    assignedTo: t.assignedTo ? users.find(u => u.id === t.assignedTo) : undefined,
}));

export const projectCategories = [
    { name: 'Creative', icon: Code },
    { name: 'Technical', icon: BookText },
    { name: 'Community', icon: UsersIcon },
    { name: 'Business & Enterprise', icon: Briefcase },
    { name: 'Learning & Research', icon: FlaskConical },
] as const;

export const learningPaths: LearningPath[] = [
  {
    id: 'lp1',
    title: 'Foundations of Ethical AI',
    description: 'Learn the core principles of ethical AI and apply them to real-world projects.',
    category: 'Technical',
    duration: '4 Weeks',
    Icon: FlaskConical,
    modules: [
        { id: 'm1', title: 'Introduction to AI Ethics', description: 'What is ethical AI and why does it matter?', content: 'This module covers the basics of AI ethics...', videoUrl: 'https://www.youtube.com/embed/pS05iU_34x0' },
        { id: 'm2', title: 'Fairness and Bias', description: 'Understanding and mitigating bias in AI systems.', content: 'This module dives deep into algorithmic bias...', videoUrl: 'https://www.youtube.com/embed/pS05iU_34x0' },
    ]
  },
  {
    id: 'lp2',
    title: 'Community Management 101',
    description: 'Master the art of building and nurturing online communities.',
    category: 'Community',
    duration: '2 Weeks',
    Icon: Handshake,
    isLocked: true,
    modules: [
        { id: 'm1', title: 'Community Engagement Strategies', description: 'Learn how to keep your community active.', content: 'Content for community engagement...' },
    ]
  },
  // Add more learning paths...
];

export let currentUserLearningProgress: UserLearningProgress[] = rawProgress;

export const interests: Interest[] = ${interestsString.replace(/"([^"]+)":/g, '$1:')};
`;
}


async function readData(): Promise<AppData> {
    // This function now uses the statically imported module.
    // It's mainly responsible for "hydrating" the data by resolving IDs to actual objects.
    
    // Create a fresh copy of users from the module to avoid direct mutation of module cache
    const users = JSON.parse(JSON.stringify(dataModule.users)).map((u: any) => ({ ...u, onboarded: u.onboarded ?? false }));
    const currentUser = JSON.parse(JSON.stringify(dataModule.currentUser));
    
    const currentUserIndex = users.findIndex((u: User) => u.id === currentUser.id);

    const projects = JSON.parse(JSON.stringify(dataModule.projects)).map((p: any) => ({
        ...p,
        team: p.team.map((m: any) => {
            const user = users.find((u: User) => u.id === m.user.id);
            return {
                user: user,
                role: m.role
            };
        })
    }));
    
    const tasks = JSON.parse(JSON.stringify(dataModule.tasks)).map((t: any) => ({
        ...t,
        assignedTo: t.assignedTo ? users.find((u: User) => u.id === t.assignedTo.id) : undefined,
    }));
    
    return {
        users: users,
        projects: projects,
        tasks: tasks,
        learningPaths: JSON.parse(JSON.stringify(dataModule.learningPaths)),
        currentUserLearningProgress: JSON.parse(JSON.stringify(dataModule.currentUserLearningProgress)),
        interests: JSON.parse(JSON.stringify(dataModule.interests)),
        currentUserIndex: currentUserIndex !== -1 ? currentUserIndex : 0,
        currentUser: users[currentUserIndex !== -1 ? currentUserIndex : 0],
    };
}


export async function getData(): Promise<AppData> {
    // If the cache is empty, read the data from the file.
    if (!dataCache) {
        dataCache = await readData();
    }
    // Return the cache directly. This is much faster.
    return dataCache;
}

export async function setData(newData: AppData): Promise<void> {
    // Update the in-memory cache immediately. We make a deep copy here
    // to ensure the cache itself is a new object, breaking references.
    dataCache = JSON.parse(JSON.stringify(newData));

    // Clear any pending write to ensure we only write the latest data.
    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }

    // Debounce writes to the file system to avoid excessive I/O operations.
    writeTimeout = setTimeout(async () => {
        try {
            const serializedData = serializeContent(dataCache!);
            await fs.writeFile(dataFilePath, serializedData, ENCODING);
            console.log("Data written to file.");
        } catch (error) {
            console.error("Error writing data file:", error);
        }
        writeTimeout = null;
    }, 500);
}

export async function updateCurrentUser(index: number): Promise<void> {
    const currentData = await getData();
    
    if (index >= 0 && index < currentData.users.length) {
        // Create a new object for the cache to ensure state updates
        const newCacheState = {
            ...currentData,
            currentUserIndex: index,
            currentUser: currentData.users[index],
        };
        // Set the new state, which will update the cache and trigger a debounced write.
        await setData(newCacheState);
    } else {
        console.error("Invalid user index provided for updateCurrentUser or cache not initialized:", index);
    }
}
