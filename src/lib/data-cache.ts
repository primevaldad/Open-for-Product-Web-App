
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import * as data from '@/lib/data';
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
const iconNameMap = Object.fromEntries(Object.entries(iconMap).map(([name, comp]) => [comp.displayName, name]));


function serializeContent(data: AppData): string {
    const usersToSave = data.users.map(u => ({...u, onboarded: u.onboarded ?? false, interests: u.interests || []}));
    const projectsToSave = data.projects.map((p: Project) => ({
        ...p,
        team: p.team.map(m => ({ user: m.user.id, role: m.role }))
    }));
    const tasksToSave = data.tasks.map((t: Task) => ({
        ...t,
        assignedTo: t.assignedTo?.id
    }));
    const learningPathsToSave = data.learningPaths.map((lp: LearningPath) => {
        const iconName = iconNameMap[lp.Icon.displayName || ''] || 'FlaskConical';
        const { Icon, ...rest } = lp;
        return { ...rest, Icon: iconName };
    });

    const usersString = JSON.stringify(usersToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const projectsString = JSON.stringify(projectsToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const tasksString = JSON.stringify(tasksToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const learningPathsString = JSON.stringify(learningPathsToSave, null, 2).replace(/"([^"]+)":/g, '$1:');
    const progressString = JSON.stringify(data.currentUserLearningProgress, null, 2).replace(/"([^"]+)":/g, '$1:');
    const interestsString = JSON.stringify(data.interests, null, 2).replace(/"([^"]+)":/g, '$1:');

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
    const users = data.users.map(u => ({...u}));
    const currentUser = data.currentUser ? users.find(u => u.id === data.currentUser.id)! : users[0];
    const currentUserIndex = users.findIndex(u => u.id === currentUser.id);

    const projects = data.projects.map(p => ({
        ...p,
        team: p.team.map(m => ({
            user: users.find(u => u.id === m.user.id)!,
            role: m.role
        }))
    }));

    const tasks = data.tasks.map(t => ({
        ...t,
        assignedTo: t.assignedTo ? users.find(u => u.id === t.assignedTo.id) : undefined
    }));

    const learningPaths = data.learningPaths.map(p => ({...p}));

    return {
        users,
        projects,
        tasks,
        learningPaths,
        currentUserLearningProgress: data.currentUserLearningProgress.map(p => ({...p})),
        interests: data.interests.map(i => ({...i})),
        currentUserIndex: currentUserIndex !== -1 ? currentUserIndex : 0,
        currentUser: currentUser,
    };
}

export async function getData(): Promise<AppData> {
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
            // In a real app, this would write to data.ts.
            // For this environment, we avoid writing to the file to prevent build issues.
            // await fs.writeFile(dataFilePath, serializedData, ENCODING);
            console.log("Data changes are cached in memory and prepared for serialization.");
        } catch (error) {
            console.error("Error serializing data:", error);
        }
        writeTimeout = null;
    }, 500);
}

export async function updateCurrentUser(index: number): Promise<void> {
    if (!dataCache) {
        await getData();
    }
    if (dataCache && index >= 0 && index < dataCache.users.length) {
        dataCache.currentUserIndex = index;
        dataCache.currentUser = dataCache.users[index];
        await setData(dataCache);
    } else {
        console.error("Invalid user index provided for updateCurrentUser or cache not initialized:", index);
    }
}
