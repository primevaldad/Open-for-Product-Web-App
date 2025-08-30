
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath, Discussion } from './types';
import fs from 'fs/promises';
import path from 'path';
import * as rawData from './raw-data';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

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

const iconMap: { [key: string]: LucideIcon } = {
    Code,
    BookText,
    UsersIcon,
    Handshake,
    Briefcase,
    FlaskConical,
};

async function fetchCollection<T>(collectionName: string): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}


async function readDataFromFirestore(): Promise<AppData> {
    const [
        users, 
        rawProjects, 
        tasks, 
        learningPaths, 
        currentUserLearningProgress, 
        interests
    ] = await Promise.all([
        fetchCollection<User>('users'),
        fetchCollection<any>('projects'),
        fetchCollection<Task>('tasks'),
        fetchCollection<LearningPath>('learningPaths'),
        fetchCollection<UserLearningProgress>('currentUserLearningProgress'),
        fetchCollection<Interest>('interests'),
    ]);

    // Hydrate projects with user data
    const projects = rawProjects.map((p: any) => {
        const team = (p.team || []).map((m: any) => ({
            user: users.find(u => u.id === m.userId),
            role: m.role,
        })).filter((m: any) => m.user); // Filter out invalid team members

        const discussions = (p.discussions || []).map((d: any) => ({
            ...d,
            user: users.find(u => u.id === d.userId),
        })).filter((d: any) => d.user);

        return { ...p, team, discussions };
    });

    const currentUserIndex = 0; // Or fetch this from a persistent source later
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


export async function getHydratedData(): Promise<AppData> {
     if (!dataCache) {
        dataCache = await readDataFromFirestore();
    }
    return dataCache;
}

// The following functions are now for seeding/writing data, not for general use in the app
export async function setData(newData: AppData): Promise<void> {
    const batch = writeBatch(db);

    newData.users.forEach(item => {
        const { id, ...data } = item;
        batch.set(doc(db, "users", id), data);
    });
     newData.projects.forEach(item => {
        const { id, ...data } = item;
        const plainTeam = data.team.map(m => ({ userId: m.user.id, role: m.role }));
        const plainDiscussions = (data.discussions || []).map(d => ({ ...d, userId: d.user.id }));
        batch.set(doc(db, "projects", id), { ...data, team: plainTeam, discussions: plainDiscussions });
    });
     newData.tasks.forEach(item => {
        const { id, ...data } = item;
        const plainTask = { ...data, assignedToId: data.assignedTo?.id };
        delete (plainTask as any).assignedTo;
        batch.set(doc(db, "tasks", id), plainTask);
    });
    newData.learningPaths.forEach(item => {
        const { id, Icon, ...data } = item;
        batch.set(doc(db, "learningPaths", id), { ...data, Icon: 'Code' /* Default Icon name */ });
    });
    newData.currentUserLearningProgress.forEach(item => {
        const id = `${item.userId}-${item.pathId}`;
        batch.set(doc(db, "currentUserLearningProgress", id), item);
    });
    newData.interests.forEach(item => {
        const { id, ...data } = item;
        batch.set(doc(db, "interests", id), data);
    });

    await batch.commit();
    dataCache = newData; // Update cache after write
}

export async function updateCurrentUser(index: number): Promise<void> {
    const cache = await getHydratedData();
    if (index >= 0 && index < cache.users.length) {
        cache.currentUserIndex = index;
        cache.currentUser = cache.users[index];
        // In a real app, this user preference would be stored per-user in the DB
        // For now, we are just updating the in-memory cache for the server's lifetime
        dataCache = cache; 
    } else {
        console.error("Invalid user index provided for updateCurrentUser or cache not initialized:", index);
    }
}
