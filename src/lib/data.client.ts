import 'client-only';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import type { Project, User, Task, LearningPath, UserLearningProgress, FundryFundingGoal } from './types';

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
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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
