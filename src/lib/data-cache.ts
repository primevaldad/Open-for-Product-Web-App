
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath, Discussion } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from './firebase-admin';

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


async function readDataFromFirestore(): Promise<Omit<AppData, 'currentUserIndex' | 'currentUser'>> {
    const [
        users, 
        rawProjects, 
        tasksData, 
        rawLearningPaths, 
        currentUserLearningProgress, 
        interests
    ] = await Promise.all([
        fetchCollection<User>('users'),
        fetchCollection<any>('projects'),
        fetchCollection<any>('tasks'),
        fetchCollection<any>('learningPaths'),
        fetchCollection<UserLearningProgress>('currentUserLearningProgress'),
        fetchCollection<Interest>('interests'),
    ]);

    // Hydrate projects with user data
    const projects = rawProjects.map((p: any) => {
        const team = (p.team || []).map((m: any) => {
            const user = users.find(u => u.id === m.userId);
            return user ? { user, role: m.role } : null;
        }).filter((m): m is { user: User, role: string } => m !== null);

        const discussions = (p.discussions || []).map((d: any) => {
             const user = users.find(u => u.id === d.userId);
             return user ? { ...d, user } : null;
        }).filter((d): d is Discussion => d !== null);

        return { ...p, team, discussions };
    });
    
    // Hydrate tasks with user data
    const tasks = tasksData.map((t: any) => {
        const assignedTo = t.assignedToId ? users.find(u => u.id === t.assignedToId) : undefined;
        return { ...t, assignedTo };
    });
    
    // Hydrate learning paths with icons
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
        interests,
    };
}


export async function getHydratedData(): Promise<AppData> {
    const data = await readDataFromFirestore();
    
    // For now, always set the current user to the first user in the database.
    const currentUserIndex = 0;
    const currentUser = data.users[currentUserIndex];

    return {
        ...data,
        currentUserIndex,
        currentUser,
    };
}
