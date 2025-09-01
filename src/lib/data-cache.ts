
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from './firebase-admin';

interface AppData {
    users: User[];
    projects: Project[];
    tasks: Task[];
    learningPaths: LearningPath[];
    currentUserLearningProgress: UserLearningProgress[];
    currentUser: User;
}

const iconMap: { [key: string]: LucideIcon } = {
    Code,
    BookText,
    UsersIcon,
    Handshake,
    Briefcase,
    FlaskConical,
};

async function fetchCollection<T>(collectionName: string): Promise<T[]> {
    const querySnapshot = await db.collection(collectionName).get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}


// This function reads all data from Firestore and hydrates it with necessary relationships.
// It is intended to be called once per request on the server.
async function readDataFromFirestore(): Promise<Omit<AppData, 'currentUser'>> {
    const [
        users, 
        rawProjects, 
        tasksData, 
        rawLearningPaths, 
        currentUserLearningProgress, 
    ] = await Promise.all([
        fetchCollection<User>('users'),
        fetchCollection<any>('projects'),
        fetchCollection<any>('tasks'),
        fetchCollection<any>('learningPaths'),
        fetchCollection<UserLearningProgress>('currentUserLearningProgress'),
    ]);

    // Hydrate projects with user data for team members and discussions
    const projects = rawProjects.map((p: any) => {
        const team = (p.team || []).map((m: any) => {
            const user = users.find(u => u.id === m.userId);
            return user ? { user, role: m.role } : null;
        }).filter((m): m is { user: User, role: string } => m !== null);

        const discussions = (p.discussions || []).map((d: any) => {
             const user = users.find(u => u.id === d.userId);
             if (!user) return null;
             return { 
                id: d.id || `${d.userId}-${d.timestamp}`, // Add a fallback id
                user, 
                content: d.content, 
                timestamp: d.timestamp 
            };
        }).filter((d): d is Project['discussions'][0] => d !== null);

        return { ...p, team, discussions };
    });
    
    // Hydrate tasks with assigned user data
    const tasks = tasksData.map((t: any) => {
        const assignedTo = t.assignedToId ? users.find(u => u.id === t.assignedToId) : undefined;
        return { ...t, assignedTo };
    });
    
    // Hydrate learning paths with icon components
    const learningPaths = rawLearningPaths.map((lp: any) => ({
        ...lp,
        Icon: iconMap[lp.Icon] || FlaskConical,
    }));

    return {
        users,
        projects,
        tasks,
        learningPaths,
        currentUserLearningProgress,
    };
}

// A simple in-memory cache to avoid re-fetching data within the same request.
// In a real-world scenario, you'd use a more robust caching solution like `unstable_cache` from Next.js.
let dataCache: AppData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000; // Cache for 1 second

export async function getHydratedData(): Promise<AppData> {
    const now = Date.now();
    if (dataCache && (now - cacheTimestamp < CACHE_DURATION)) {
        return dataCache;
    }

    const { users, ...rest } = await readDataFromFirestore();
    
    // For this prototype, we'll hardcode the current user as the first one.
    // In a real app, this would come from an authentication session.
    const currentUser = users[0];
    if (!currentUser) {
        throw new Error("No users found in the database. Please seed the database.");
    }

    dataCache = {
        users,
        currentUser,
        ...rest,
    };
    cacheTimestamp = now;

    return dataCache;
}
