
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath, Discussion } from './types';
import fs from 'fs/promises';
import path from 'path';
import * as rawData from './raw-data';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'raw-data.ts');
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
    Code,
    BookText,
    UsersIcon,
    Handshake,
    Briefcase,
    FlaskConical,
};
const iconNameMap: { [key: string]: string } = Object.fromEntries(
    Object.entries(iconMap).map(([name, comp]) => [comp.displayName || name, name])
);


function serializeContent(dataToSerialize: AppData): string {
    const usersToSave = dataToSerialize.users.map(u => ({...u, onboarded: u.onboarded ?? false, interests: u.interests || []}));
    
    const projectsToSave = dataToSerialize.projects.map((p: Project) => ({
        ...p,
        team: p.team.map(m => ({ user: m.user.id, role: m.role })),
        discussions: p.discussions.map(d => ({
            ...d,
            user: d.user.id,
        })),
    }));

    const tasksToSave = dataToSerialize.tasks.map((t: Task) => ({
        ...t,
        assignedTo: t.assignedTo?.id
    }));

    const learningPathsToSave = dataToSerialize.learningPaths.map((lp: LearningPath) => {
        const iconName = iconNameMap[lp.Icon.displayName || ''] || 'FlaskConical';
        const { Icon, ...rest } = lp;
        return { ...rest, Icon: iconName };
    });

    const usersString = JSON.stringify(usersToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const projectsString = JSON.stringify(projectsToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const tasksString = JSON.stringify(tasksToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const learningPathsString = JSON.stringify(learningPathsToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const progressString = JSON.stringify(dataToSerialize.currentUserLearningProgress, null, 2).replace(/"([^"]+)":/g, '$1:');
    const interestsString = JSON.stringify(dataToSerialize.interests, null, 2).replace(/"([^"]+)":/g, '$1:');

    return `
import type { Project, Task, User, UserLearningProgress, ProjectCategory, Interest } from './types';
import type { LearningPath } from './types';

// Raw data, to be hydrated by other modules
export const rawUsers: Omit<User, 'onboarded'>[] = ${usersString};

export const rawProjects = ${projectsString};

export const rawTasks = ${tasksString};

export const rawLearningPaths: Omit<LearningPath, 'Icon'> & { Icon: string }[] = ${learningPathsString};

export const rawProgress: UserLearningProgress[] = ${progressString};

export const rawInterests: Interest[] = ${interestsString};
`;
}


async function readData(): Promise<AppData> {
    const users = rawData.rawUsers.map(u => ({ ...u, onboarded: u.onboarded ?? true })) as User[];
    
    const projects = rawData.rawProjects.map((p: any) => ({
        ...p,
        team: p.team.map((m: any) => ({
            user: users.find(u => u.id === m.user)!,
            role: m.role
        })),
        discussions: (p.discussions || []).map((d: any) => ({
            ...d,
            user: users.find(u => u.id === d.user)!,
        }))
    })) as Project[];
    
    const tasks = rawData.rawTasks.map((t: any) => ({
        ...t,
        assignedTo: t.assignedTo ? users.find(u => u.id === t.assignedTo) : undefined,
    })) as Task[];
    
    const learningPaths = rawData.rawLearningPaths.map(p => ({
        ...p,
        Icon: iconMap[p.Icon] || FlaskConical,
    })) as LearningPath[];

    const currentUserLearningProgress = rawData.rawProgress.map(p => ({...p}));
    const interests = rawData.rawInterests.map(i => ({...i}));

    const currentUserIndex = 0; // Default to first user
    const currentUser = users[currentUserIndex];

    return {
        users,
        projects,
        tasks,
        learningPaths,
        currentUserLearningProgress,
        interests,
        currentUserIndex,
        currentUser,
    };
}

export async function getData(): Promise<AppData> {
    if (!dataCache) {
        dataCache = await readData();
    }
    // Return a deep copy to prevent mutation of the cache
    return JSON.parse(JSON.stringify(dataCache, (key, value) => {
        // Functions cannot be stringified, so we handle Icons separately
        if (key === 'Icon') {
            return undefined;
        }
        return value;
    }));
}

export async function getHydratedData(): Promise<AppData> {
     if (!dataCache) {
        dataCache = await readData();
    }
    return dataCache;
}

export async function setData(newData: AppData): Promise<void> {
    dataCache = newData;

    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }

    writeTimeout = setTimeout(async () => {
        try {
            if (!dataCache) return;
            const serializedData = serializeContent(dataCache);
            await fs.writeFile(dataFilePath, serializedData, ENCODING);
            console.log("Data changes written to raw-data.ts.");
        } catch (error) {
            console.error("Error writing data:", error);
        }
        writeTimeout = null;
    }, 500);
}

export async function updateCurrentUser(index: number): Promise<void> {
    const cache = await getHydratedData();
    if (index >= 0 && index < cache.users.length) {
        cache.currentUserIndex = index;
        cache.currentUser = cache.users[index];
        await setData(cache);
    } else {
        console.error("Invalid user index provided for updateCurrentUser or cache not initialized:", index);
    }
}

    