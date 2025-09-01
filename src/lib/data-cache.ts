
import type { Project, Task, User, UserLearningProgress, Interest, LearningPath, ProjectMember, Discussion } from './types';
import { Code, BookText, Users as UsersIcon, Handshake, Briefcase, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { db } from './firebase-admin';

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

async function fetchDoc<T>(collectionName: string, docId: string): Promise<T | null> {
    const docSnapshot = await db.collection(collectionName).doc(docId).get();
    if (!docSnapshot.exists) {
        return null;
    }
    return { id: docSnapshot.id, ...docSnapshot.data() } as T;
}

// In a real app, the current user would be determined from the session.
// For this prototype, we'll consistently use the first user as the current user.
async function getCurrentUser(): Promise<User> {
    const users = await fetchCollection<User>('users');
    if (users.length === 0) {
        throw new Error("No users found in the database. Please seed the database.");
    }
    return users[0];
}

async function getAllUsers(): Promise<User[]> {
    return fetchCollection<User>('users');
}

async function hydrateProjectTeam(project: any, allUsers: User[]): Promise<Project> {
    const team: ProjectMember[] = (project.team || []).map((m: any) => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { user, role: m.role } : null;
    }).filter((m): m is { user: User, role: string } => m !== null);

    const discussions: Discussion[] = (project.discussions || []).map((d: any) => {
        const user = allUsers.find(u => u.id === d.userId);
        if (!user) return null;
        return { 
           id: d.id || `${d.userId}-${d.timestamp}`,
           user, 
           content: d.content, 
           timestamp: d.timestamp 
       };
   }).filter((d): d is Discussion => d !== null);

    return { ...project, team, discussions };
}


export async function getDashboardPageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    const rawProjects = await fetchCollection<any>('projects');
    
    const projects = await Promise.all(
        rawProjects.map(p => hydrateProjectTeam(p, allUsers))
    );

    return {
        currentUser,
        users: allUsers,
        projects
    }
}

export async function getProjectPageData(projectId: string) {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    const rawProject = await fetchDoc<any>('projects', projectId);

    if (!rawProject) return { project: null, projectTasks: [], currentUser, allUsers };

    const project = await hydrateProjectTeam(rawProject, allUsers);
    
    const tasksSnapshot = await db.collection('tasks').where('projectId', '==', projectId).get();
    const projectTasks = tasksSnapshot.docs.map(doc => {
        const taskData = doc.data();
        const assignedTo = taskData.assignedToId ? allUsers.find(u => u.id === taskData.assignedToId) : undefined;
        return { id: doc.id, ...taskData, assignedTo } as Task;
    });

    return { project, projectTasks, currentUser, allUsers };
}

export async function getDraftsPageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    const rawProjects = await fetchCollection<any>('projects');

    const projects = await Promise.all(
        rawProjects.map(p => hydrateProjectTeam(p, allUsers))
    );

    return { currentUser, projects, users: allUsers };
}

export async function getLearningPageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    const rawLearningPaths = await fetchCollection<any>('learningPaths');
    const learningPaths = rawLearningPaths.map((lp: any) => ({
        ...lp,
        Icon: iconMap[lp.Icon] || FlaskConical,
    }));
    return { currentUser, learningPaths, users: allUsers };
}

export async function getLearningPathDetailPageData(pathId: string) {
    const rawPath = await fetchDoc<any>('learningPaths', pathId);
    if (!rawPath) return { path: null, currentUserLearningProgress: [] };

    const path = { ...rawPath, Icon: iconMap[rawPath.Icon] || FlaskConical };
    const progressSnapshot = await db.collection('currentUserLearningProgress').where('pathId', '==', pathId).get();
    const currentUserLearningProgress = progressSnapshot.docs.map(doc => doc.data() as UserLearningProgress);

    return { path, currentUserLearningProgress };
}

export async function getLearningModulePageData(pathId: string, moduleId: string) {
    const currentUser = await getCurrentUser();
    const rawPath = await fetchDoc<any>('learningPaths', pathId);

    if (!rawPath) return { path: null, module: null, userProgress: undefined, currentUser, prevModule: null, nextModule: null };

    const { Icon, ...serializablePath } = { ...rawPath, Icon: iconMap[rawPath.Icon] || FlaskConical };
    const module = serializablePath.modules.find((m: Module) => m.id === moduleId) || null;

    const progressSnapshot = await db.collection('currentUserLearningProgress').where('userId', '==', currentUser.id).where('pathId', '==', pathId).limit(1).get();
    const userProgress = progressSnapshot.empty ? undefined : progressSnapshot.docs[0].data() as UserLearningProgress;
    
    const currentModuleIndex = serializablePath.modules.findIndex((m: Module) => m.id === moduleId);
    const prevModule = currentModuleIndex > 0 ? serializablePath.modules[currentModuleIndex - 1] : null;
    const nextModule = currentModuleIndex < serializablePath.modules.length - 1 ? serializablePath.modules[currentModuleIndex + 1] : null;

    return { path: serializablePath, module, userProgress, currentUser, prevModule, nextModule };
}


export async function getActivityPageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    const rawProjects = await fetchCollection<any>('projects');
    const projects = await Promise.all(
        rawProjects.map(p => hydrateProjectTeam(p, allUsers))
    );

    const tasksSnapshot = await db.collection('tasks').where('assignedToId', '==', currentUser.id).get();
    const myTasks = tasksSnapshot.docs.map(doc => {
         const taskData = doc.data();
         const assignedTo = allUsers.find(u => u.id === taskData.assignedToId); // Should always be currentUser
         return { id: doc.id, ...taskData, assignedTo } as Task;
    });

    const progressSnapshot = await db.collection('currentUserLearningProgress').where('userId', '==', currentUser.id).get();
    const currentUserLearningProgress = progressSnapshot.docs.map(doc => doc.data() as UserLearningProgress);

    const rawLearningPaths = await fetchCollection<any>('learningPaths');
    const learningPaths = rawLearningPaths.map((lp: any) => ({
        ...lp,
        Icon: iconMap[lp.Icon] || FlaskConical,
    }));

    return { currentUser, projects, tasks: myTasks, learningPaths, currentUserLearningProgress, users: allUsers };
}

export async function getUserProfilePageData(userId: string) {
    const currentUser = await getCurrentUser();
    const user = await fetchDoc<User>('users', userId);

    if (!user) return { user: null, userProjects: [], currentUser };
    
    const allUsers = await getAllUsers(); // needed for hydrating team
    const projectsSnapshot = await db.collection('projects').where('team', 'array-contains', { role: 'participant', userId: userId }).get();
    // This query is simplified. A real app might need to query for leads too or use a different data model.
    const rawProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const userProjects = await Promise.all(
        rawProjects.map(p => hydrateProjectTeam(p, allUsers))
    );

    return { user, userProjects, currentUser };
}

export async function getEditProjectPageData(projectId: string) {
    const currentUser = await getCurrentUser();
    const rawProject = await fetchDoc<any>('projects', projectId);
    
    if (!rawProject) return { project: null, currentUser };

    const allUsers = await getAllUsers();
    const project = await hydrateProjectTeam(rawProject, allUsers);
    
    return { project, currentUser };
}

export async function getCreatePageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    return { currentUser, users: allUsers };
}

export async function getSettingsPageData() {
    const currentUser = await getCurrentUser();
    const allUsers = await getAllUsers();
    return { currentUser, users: allUsers };
}
