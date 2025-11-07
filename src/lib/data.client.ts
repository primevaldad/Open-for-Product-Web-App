import 'client-only';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Project, User, Task, LearningPath, UserLearningProgress } from './types';

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
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, where("projectId", "==", projectId));
    const taskSnapshot = await getDocs(q);
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
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
