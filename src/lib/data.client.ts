import 'client-only';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Project, User, Task, LearningPath, UserLearningProgress, FundryFundingGoal, ProjectInvite } from './types';

// This file contains read-only, client-side data access functions.

// --- User Data Access ---
export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return undefined;
}

// --- Project Data Access ---
export async function findProjectById(projectId: string): Promise<Project | undefined> {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return undefined;
}

// --- Task Data Access ---
export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
    const tasksCol = collection(db, `projects/${projectId}/tasks`);
    const q = query(tasksCol);
    const taskSnapshot = await getDocs(q);
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export function subscribeToProjectTasks(projectId: string, callback: (tasks: Task[]) => void): () => void {
    console.log(`[subscribeToProjectTasks] Subscribing to tasks for project ${projectId}`);
    const tasksCol = collection(db, `projects/${projectId}/tasks`);
    const q = query(tasksCol);
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        console.log(`[onSnapshot] Received ${tasks.length} tasks for project ${projectId}`, tasks);
        callback(tasks);
    });
}

// --- Funding Goals Data Access ---
export function subscribeToProjectFundingGoals(projectId: string, callback: (goals: FundryFundingGoal[]) => void): () => void {
    const goalsCol = collection(db, `projects/${projectId}/fundingGoals`);
    return onSnapshot(goalsCol, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundryFundingGoal));
        // Sort by createdAt desc to match server side
        goals.sort((a, b) => {
            const getTime = (val: any) => {
                if (!val) return 0;
                if (typeof val === 'string') return new Date(val).getTime();
                if (typeof val.toMillis === 'function') return val.toMillis();
                return 0;
            };
            const dateA = getTime(a.createdAt);
            const dateB = getTime(b.createdAt);
            return dateB - dateA;
        });
        callback(goals);
    });
}

// --- Learning Progress Data Access ---
export async function findUserLearningProgress(userId: string, pathId: string): Promise<UserLearningProgress | undefined> {
    const docId = `${userId}_${pathId}`;
    const progressRef = doc(db, 'userLearningProgress', docId);
    const progressSnap = await getDoc(progressRef);
    if(progressSnap.exists()) {
        return { ...progressSnap.data() } as UserLearningProgress;
    }
    return undefined;
}

// --- Project Invites Real-time Subscriptions ---

/**
 * For project leads: subscribes to ALL invites for a given project.
 * Requires the caller to be the project owner (enforced by Firestore rules via get() lookup).
 */
export function subscribeToProjectInvites(
    projectId: string,
    callback: (invites: ProjectInvite[]) => void
): () => void {
    const q = query(
        collection(db, 'projectInvites'),
        where('projectId', '==', projectId)
    );
    return onSnapshot(q, (snapshot) => {
        const now = new Date();
        const invites = snapshot.docs.map(docSnap => {
            const data = { id: docSnap.id, ...docSnap.data() } as ProjectInvite;
            // Mirror server-side expiry detection
            if (data.status === 'pending') {
                const expiresAt = (data.expiresAt as unknown as Timestamp)?.toDate?.() ||
                    new Date(data.expiresAt as string);
                if (now > expiresAt) {
                    data.status = 'expired';
                }
            }
            return data;
        });
        callback(invites);
    });
}

/**
 * For invitees: subscribes to invites sent to a specific email for a project.
 * Firestore rules permit this because request.auth.token.email matches resource.data.email.
 */
export function subscribeToMyProjectInvites(
    projectId: string,
    email: string,
    callback: (invites: ProjectInvite[]) => void
): () => void {
    const q = query(
        collection(db, 'projectInvites'),
        where('projectId', '==', projectId),
        where('email', '==', email)
    );
    return onSnapshot(q, (snapshot) => {
        const now = new Date();
        const invites = snapshot.docs.map(docSnap => {
            const data = { id: docSnap.id, ...docSnap.data() } as ProjectInvite;
            if (data.status === 'pending') {
                const expiresAt = (data.expiresAt as unknown as Timestamp)?.toDate?.() ||
                    new Date(data.expiresAt as string);
                if (now > expiresAt) {
                    data.status = 'expired';
                }
            }
            return data;
        });
        callback(invites);
    });
}
