
import type { Project, Task, User, UserLearningProgress, Interest } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

// This is a server-side only file.
// Do not import it into client components.

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');
const ENCODING = 'utf-8';

interface AppData {
    users: User[];
    projects: Project[];
    tasks: Task[];
    learningPaths: any[]; // Add this to your AppData interface
    currentUserLearningProgress: UserLearningProgress[];
    interests: Interest[];
    currentUserIndex: number;
    currentUser: User;
}

let dataCache: AppData | null = null;
let writeTimeout: NodeJS.Timeout | null = null;

function serializeContent(data: AppData): string {
    const usersString = JSON.stringify(data.users.map(u => ({...u, interests: u.interests || []})), null, 2);
    
    // When serializing projects, we store user IDs instead of full user objects.
    const projectsToSave = data.projects.map(p => ({
        ...p,
        team: p.team.map(m => ({ user: m.user.id, role: m.role }))
    }));
    const projectsString = JSON.stringify(projectsToSave, null, 2);

    // When serializing tasks, we store the assigned user's ID.
    const tasksToSave = data.tasks.map(t => ({
        ...t,
        assignedTo: t.assignedTo?.id
    }));
    const tasksString = JSON.stringify(tasksToSave, null, 2);
    
    const progressString = JSON.stringify(data.currentUserLearningProgress, null, 2);
    const interestsString = JSON.stringify(data.interests, null, 2);
    
    // Learning paths are static and defined in the file, so we don't need to serialize them.
    // They will be preserved.

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
    // Dynamically import the data file to get the latest version, bypassing require cache
    const dataModule = await import(`../lib/data.ts?timestamp=${Date.now()}`);
    
    const currentUserIndex = dataModule.users.findIndex((u: User) => u.id === dataModule.currentUser.id);
    
    return {
        users: dataModule.users,
        projects: dataModule.projects,
        tasks: dataModule.tasks,
        learningPaths: dataModule.learningPaths,
        currentUserLearningProgress: dataModule.currentUserLearningProgress,
        interests: dataModule.interests,
        currentUserIndex: currentUserIndex !== -1 ? currentUserIndex : 0,
        currentUser: dataModule.currentUser,
    };
}


export async function getData(): Promise<AppData> {
    // In a real app, you might fetch from a database. For this prototype, we'll read from our ts file.
    // This function is intended for server-side use.
    if (!dataCache) {
        dataCache = await readData();
    }
    // Return a deep copy to prevent direct mutation of the cache
    return JSON.parse(JSON.stringify(dataCache));
}

export async function setData(newData: AppData): Promise<void> {
    dataCache = JSON.parse(JSON.stringify(newData)); // Update cache with a deep copy

    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }

    // Debounce writes to the file system
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
    const data = await getData();
    if (index >= 0 && index < data.users.length) {
        data.currentUserIndex = index;
        data.currentUser = data.users[index];
        await setData(data);
    } else {
        console.error("Invalid user index provided for updateCurrentUser:", index);
    }
}
