
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import * as dataModule from '@/lib/data';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');
const ENCODING = 'utf-8';

interface AppData {
    users: User[];
    projects: Project[];
    tasks: Task[];
    learningPaths: LearningPath[];
    currentUserLearningProgress: UserLearningProgress[];
    interests: Interest[];
    currentUserIndex: number;
    currentUser: User;
}

let dataCache: AppData | null = null;
let writeTimeout: NodeJS.Timeout | null = null;

const iconMap: { [key: string]: LucideIcon } = {
    FlaskConical,
    Handshake,
    // Add other icons used in learningPaths here
};

function serializeContent(data: AppData): string {
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
    
    // During serialization, convert the Icon component to its string name
    const learningPathsToSave = dataToSerialize.learningPaths.map((lp: LearningPath) => {
        const iconName = Object.keys(iconMap).find(key => iconMap[key] === lp.Icon);
        return { ...lp, Icon: iconName || 'FlaskConical' }; // a default icon
    });
    const learningPathsString = JSON.stringify(learningPathsToSave, null, 2);

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

export const rawLearningPaths = ${learningPathsString.replace(/"([^"]+)":/g, '$1:')};

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
    const users = JSON.parse(JSON.stringify(dataModule.users)).map((u: any) => ({ ...u, onboarded: u.onboarded ?? false }));
    const currentUser = JSON.parse(JSON.stringify(dataModule.currentUser));
    const currentUserIndex = users.findIndex((u: User) => u.id === currentUser.id);

    const projects = JSON.parse(JSON.stringify(dataModule.projects)).map((p: any) => ({
        ...p,
        team: p.team.map((m: any) => {
            const user = users.find((u: User) => u.id === m.user.id);
            return { user, role: m.role };
        })
    }));

    const tasks = JSON.parse(JSON.stringify(dataModule.tasks)).map((t: any) => ({
        ...t,
        assignedTo: t.assignedTo ? users.find((u: User) => u.id === t.assignedTo.id) : undefined,
    }));

    // Hydrate learning paths with actual Icon components
    const learningPaths = JSON.parse(JSON.stringify(dataModule.learningPaths)).map((lp: any) => ({
        ...lp,
        Icon: iconMap[lp.Icon as string] || FlaskConical,
    }));

    return {
        users,
        projects,
        tasks,
        learningPaths,
        currentUserLearningProgress: JSON.parse(JSON.stringify(dataModule.currentUserLearningProgress)),
        interests: JSON.parse(JSON.stringify(dataModule.interests)),
        currentUserIndex: currentUserIndex !== -1 ? currentUserIndex : 0,
        currentUser: users[currentUserIndex !== -1 ? currentUserIndex : 0],
    };
}


export async function getData(): Promise<AppData> {
    if (!dataCache) {
        dataCache = await readData();
    }
    return dataCache;
}

export async function setData(newData: AppData): Promise<void> {
    dataCache = JSON.parse(JSON.stringify(newData));

    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }

    writeTimeout = setTimeout(async () => {
        try {
            const serializedData = serializeContent(dataCache!);
            // We are not writing to file for now to avoid the serialization issue with icons
            // await fs.writeFile(dataFilePath, serializedData, ENCODING);
            // console.log("Data written to file.");
        } catch (error) {
            console.error("Error writing data file:", error);
        }
        writeTimeout = null;
    }, 500);
}

export async function updateCurrentUser(index: number): Promise<void> {
    const currentData = await getData();
    
    if (index >= 0 && index < currentData.users.length) {
        const newCacheState = {
            ...currentData,
            currentUserIndex: index,
            currentUser: currentData.users[index],
        };
        await setData(newCacheState);
    } else {
        console.error("Invalid user index provided for updateCurrentUser or cache not initialized:", index);
    }
}
