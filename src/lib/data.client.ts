import 'client-only';
import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import type { Project, User, Discussion, ProjectMember, Task, LearningPath, UserLearningProgress } from './types';

// --- User Data Access ---
export async function getAllUsers(): Promise<User[]> {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return undefined;
}

export async function addUser(uid: string, newUser: Omit<User, 'id'>): Promise<void> {
    await setDoc(doc(db, 'users', uid), newUser);
}


export async function updateUser(updatedUser: User): Promise<void> {
    const { id, ...userData } = updatedUser;
    const userRef = doc(db, 'users', id);
    await updateDoc(userRef, userData);
}

// --- Project Data Access ---
export async function getAllProjects(): Promise<Project[]> {
    const projectsCol = collection(db, 'projects');
    const projectSnapshot = await getDocs(projectsCol);
    return projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function findProjectById(projectId: string): Promise<Project | undefined> {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return undefined;
}

export async function addProject(newProject: Project): Promise<void> {
    const { id, ...projectData } = newProject;
    await setDoc(doc(db, 'projects', id), projectData);
}

export async function updateProject(updatedProject: Project): Promise<void> {
    const { id, ...projectData } = updatedProject;
    const projectRef = doc(db, 'projects', id);
    await updateDoc(projectRef, projectData);
}

// --- Task Data Access ---
export async function getAllTasks(): Promise<Task[]> {
    const tasksCol = collection(db, 'tasks');
    const taskSnapshot = await getDocs(tasksCol);
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, where("projectId", "==", projectId));
    const taskSnapshot = await getDocs(q);
    return taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export async function findTaskById(taskId: string): Promise<Task | undefined> {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        return { id: taskSnap.id, ...taskSnap.data() } as Task;
    }
    return undefined;
}

export async function addTask(newTask: Task): Promise<void> {
    const { id, ...taskData } = newTask;
    await setDoc(doc(db, 'tasks', id), taskData);
}

export async function updateTask(updatedTask: Task): Promise<void> {
    const { id, ...taskData } = updatedTask;
    const taskRef = doc(db, 'tasks', id);
    await updateDoc(taskRef, taskData);
}

export async function deleteTask(taskId: string): Promise<void> {
    await deleteDoc(doc(db, 'tasks', taskId));
}

// --- Learning Progress Data Access ---
export async function getAllUserLearningProgress(): Promise<UserLearningProgress[]> {
    const progressCol = collection(db, 'userLearningProgress');
    const progressSnapshot = await getDocs(progressCol);
    return progressSnapshot.docs.map(doc => ({ ...doc.data() } as UserLearningProgress));
}

export async function findUserLearningProgress(userId: string, pathId: string): Promise<UserLearningProgress | undefined> {
    const progressCol = collection(db, 'userLearningProgress');
    // Firestore doesn't support compound unique keys well, so we create a custom ID
    const docId = `${userId}_${pathId}`;
    const progressRef = doc(db, 'userLearningProgress', docId);
    const progressSnap = await getDoc(progressRef);
    if(progressSnap.exists()) {
        return { ...progressSnap.data() } as UserLearningProgress;
    }
    return undefined;
}

export async function updateUserLearningProgress(progress: UserLearningProgress): Promise<void> {
    const docId = `${progress.userId}_${progress.pathId}`;
    const progressRef = doc(db, 'userLearningProgress', docId);
    await setDoc(progressRef, progress, { merge: true });
}

export async function getAllLearningPaths(): Promise<LearningPath[]> {
    const pathsCol = collection(db, 'learningPaths');
    const pathSnapshot = await getDocs(pathsCol);
    return pathSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPath));
}
