
import type { Project, User, Discussion, ProjectMember, Task, LearningPath, UserLearningProgress } from './types';
import { mockUsers, mockProjects, mockTasks, mockLearningPaths, mockUserLearningProgress } from './mock-data';

// --- In-Memory "Database" using a Singleton Pattern ---
// This ensures that our "database" is initialized only once and persists across hot reloads
// in the development environment, making changes durable for the session.

interface Db {
    users: User[];
    projects: Project[];
    tasks: Task[];
    learningPaths: LearningPath[];
    userLearningProgress: UserLearningProgress[];
}

declare global {
  var __db: Db | undefined;
}

const initializeDb = (): Db => {
    console.log('--- Initializing In-Memory Database ---');
    return {
        users: JSON.parse(JSON.stringify(mockUsers)),
        projects: JSON.parse(JSON.stringify(mockProjects)),
        tasks: JSON.parse(JSON.stringify(mockTasks)),
        learningPaths: JSON.parse(JSON.stringify(mockLearningPaths)),
        userLearningProgress: JSON.parse(JSON.stringify(mockUserLearningProgress)),
    };
}

const db = globalThis.__db ?? (globalThis.__db = initializeDb());


// In a real app, these functions would be database queries (e.g., to Firestore or a SQL DB).

// --- User Data Access ---
export function getAllUsers(): User[] {
    return db.users;
}

export function findUserById(userId: string): User | undefined {
    return db.users.find(u => u.id === userId);
}

export function getCurrentUser(): User | null {
    const user = findUserById('u1');
    if (!user) {
        console.error("Could not find the default user (u1).");
        return null;
    }
    return user;
}

export function updateUser(updatedUser: User): void {
    const userIndex = db.users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        db.users[userIndex] = updatedUser;
    }
}

// --- Project Data Access ---
export function getAllProjects(): Project[] {
    return db.projects;
}

export function findProjectById(projectId: string): Project | undefined {
    return db.projects.find(p => p.id === projectId);
}

export function addProject(newProject: Project): void {
    db.projects.push(newProject);
}

export function updateProject(updatedProject: Project): void {
    const projectIndex = db.projects.findIndex(p => p.id === updatedProject.id);
    if (projectIndex !== -1) {
        db.projects[projectIndex] = updatedProject;
    }
}

// --- Task Data Access ---
export function getAllTasks(): Task[] {
    return db.tasks;
}

export function findTasksByProjectId(projectId: string): Task[] {
    return db.tasks.filter(t => t.projectId === projectId);
}

export function findTaskById(taskId: string): Task | undefined {
    return db.tasks.find(t => t.id === taskId);
}

export function addTask(newTask: Task): void {
    db.tasks.push(newTask);
}

export function updateTask(updatedTask: Task): void {
    const taskIndex = db.tasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
        db.tasks[taskIndex] = updatedTask;
    }
}

export function deleteTask(taskId: string): void {
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        db.tasks.splice(taskIndex, 1);
    }
}


// --- Learning Progress Data Access ---
export function getAllUserLearningProgress(): UserLearningProgress[] {
    return db.userLearningProgress;
}

export function findUserLearningProgress(userId: string, pathId: string): UserLearningProgress | undefined {
    return db.userLearningProgress.find(p => p.userId === userId && p.pathId === pathId);
}

export function updateUserLearningProgress(progress: UserLearningProgress): void {
    const progressIndex = db.userLearningProgress.findIndex(p => p.userId === progress.userId && p.pathId === progress.pathId);
    if (progressIndex !== -1) {
        db.userLearningProgress[progressIndex] = progress;
    } else {
        db.userLearningProgress.push(progress);
    }
}

export function getAllLearningPaths(): LearningPath[] {
    return db.learningPaths;
}

// --- Data Hydration ---
// This function remains crucial for combining raw data into rich objects for the UI.
export function hydrateProjectTeam(project: Project): Project {
    const allUsers = getAllUsers();

    const team: ProjectMember[] = (project.team || []).map((m: any) => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { user, role: m.role } : null;
    }).filter((m): m is ProjectMember => m !== null);

    const discussions: Discussion[] = (project.discussions || []).map((d: any) => {
        const user = allUsers.find(u => u.id === d.userId);
        if (!user) return null;
        const timestamp = d.timestamp instanceof Date ? d.timestamp.getTime() : new Date(d.timestamp).getTime();
        return {
           id: `${d.userId}-${timestamp}`,
           user,
           content: d.content,
           timestamp: new Date(timestamp).toISOString(),
       };
   }).filter((d): d is Discussion => d !== null);

    return { ...project, team, discussions };
}
