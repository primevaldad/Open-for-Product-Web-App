import 'server-only';
import { adminDb } from './firebase.server';
import type { Project, User, Discussion, ProjectMember, Task, LearningPath, UserLearningProgress } from './types';

// This file contains server-side data access functions.
// It uses the firebase-admin SDK and is designed to run in a Node.js environment.

// --- User Data Access ---
export async function getAllUsers(): Promise<User[]> {
    const usersCol = adminDb.collection('users');
    const userSnapshot = await usersCol.get();
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return undefined;
}

export async function addUser(uid: string, newUser: Omit<User, 'id'>): Promise<void> {
    await adminDb.collection('users').doc(uid).set(newUser);
}

export async function updateUser(updatedUser: User): Promise<void> {
    const { id, ...userData } = updatedUser;
    const userRef = adminDb.collection('users').doc(id);
    await userRef.update(userData);
}

// --- Project Data Access (Refactored for explicit data shaping) ---
export async function getAllProjects(): Promise<Project[]> {
    const projectsCol = adminDb.collection('projects');
    const projectSnapshot = await projectsCol.get();
    return projectSnapshot.docs.map(doc => {
        const data = doc.data();
        // Explicitly shape the project data to ensure it's raw and non-hydrated.
        return {
            id: doc.id,
            name: data.name,
            tagline: data.tagline,
            description: data.description,
            category: data.category,
            timeline: data.timeline,
            contributionNeeds: data.contributionNeeds,
            progress: data.progress,
            team: data.team || [], // Ensure team is always an array
            votes: data.votes,
            discussions: data.discussions || [], // Ensure discussions is always an array
            status: data.status,
            governance: data.governance,
        } as Project;
    });
}

export async function findProjectById(projectId: string): Promise<Project | undefined> {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
        const data = projectSnap.data();
        // Explicitly shape the project data to ensure it's raw and non-hydrated.
        return {
            id: projectSnap.id,
            name: data.name,
            tagline: data.tagline,
            description: data.description,
            category: data.category,
            timeline: data.timeline,
            contributionNeeds: data.contributionNeeds,
            progress: data.progress,
            team: data.team || [],
            votes: data.votes,
            discussions: data.discussions || [],
            status: data.status,
            governance: data.governance,
        } as Project;
    }
    return undefined;
}

export async function addProject(newProject: Project): Promise<void> {
    const { id, ...projectData } = newProject;
    await adminDb.collection('projects').doc(id).set(projectData);
}

export async function updateProject(updatedProject: Project): Promise<void> {
    const { id, ...projectData } = updatedProject;
    const projectRef = adminDb.collection('projects').doc(id);
    await projectRef.update(projectData);
}

// --- Task Data Access ---
export async function getAllTasks(): Promise<Task[]> {
    const tasksCol = adminDb.collection('tasks');
    const taskSnapshot = await tasksCol.get();
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
    const tasksCol = adminDb.collection('tasks');
    const q = tasksCol.where("projectId", "==", projectId);
    const taskSnapshot = await q.get();
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export async function findTaskById(taskId: string): Promise<Task | undefined> {
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();
    if (taskSnap.exists) {
        return { id: taskSnap.id, ...taskSnap.data() } as Task;
    }
    return undefined;
}

export async function addTask(newTask: Task): Promise<void> {
    const { id, ...taskData } = newTask;
    await adminDb.collection('tasks').doc(id).set(taskData);
}

export async function updateTask(updatedTask: Task): Promise<void> {
    const { id, ...taskData } = updatedTask;
    const taskRef = adminDb.collection('tasks').doc(id);
    await taskRef.update(taskData);
}

export async function deleteTask(taskId: string): Promise<void> {
    await adminDb.collection('tasks').doc(taskId).delete();
}

// --- Learning Progress Data Access ---
export async function getAllUserLearningProgress(): Promise<UserLearningProgress[]> {
    const progressCol = adminDb.collection('userLearningProgress');
    const progressSnapshot = await progressCol.get();
    return progressSnapshot.docs.map(doc => ({ ...doc.data() } as UserLearningProgress));
}

export async function findUserLearningProgress(userId: string, pathId: string): Promise<UserLearningProgress | undefined> {
    const docId = `${userId}_${pathId}`;
    const progressRef = adminDb.collection('userLearningProgress').doc(docId);
    const progressSnap = await progressRef.get();
    if(progressSnap.exists) {
        return { ...progressSnap.data() } as UserLearningProgress;
    }
    return undefined;
}

export async function updateUserLearningProgress(progress: UserLearningProgress): Promise<void> {
    const docId = `${progress.userId}_${progress.pathId}`;
    const progressRef = adminDb.collection('userLearningProgress').doc(docId);
    await progressRef.set(progress, { merge: true });
}

export async function getAllLearningPaths(): Promise<LearningPath[]> {
    const pathsCol = adminDb.collection('learningPaths');
    const pathSnapshot = await pathsCol.get();
    return pathSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPath));
}
