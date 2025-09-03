
import type { Project, User, Discussion, ProjectMember, Task, LearningPath, UserLearningProgress } from './types';
import { mockUsers, mockProjects, mockTasks, mockLearningPaths, mockUserLearningProgress } from './mock-data';

// --- In-Memory "Database" ---
// This is a more robust simulation of a database for this prototype.
// We create a "live" copy of the seeded mock data that our server actions will interact with.
// This prevents issues with module caching in the serverless environment and centralizes data access.

let liveUsers: User[] = JSON.parse(JSON.stringify(mockUsers));
let liveProjects: Project[] = JSON.parse(JSON.stringify(mockProjects));
let liveTasks: Task[] = JSON.parse(JSON.stringify(mockTasks));
let liveLearningPaths: LearningPath[] = JSON.parse(JSON.stringify(mockLearningPaths));
let liveUserLearningProgress: UserLearningProgress[] = JSON.parse(JSON.stringify(mockUserLearningProgress));

// In a real app, these functions would be database queries (e.g., to Firestore or a SQL DB).

// --- User Data Access ---
export function getAllUsers(): User[] {
    return liveUsers;
}

export function findUserById(userId: string): User | undefined {
    return liveUsers.find(u => u.id === userId);
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
    const userIndex = liveUsers.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        liveUsers[userIndex] = updatedUser;
    }
}

// --- Project Data Access ---
export function getAllProjects(): Project[] {
    return liveProjects;
}

export function findProjectById(projectId: string): Project | undefined {
    return liveProjects.find(p => p.id === projectId);
}

export function addProject(newProject: Project): void {
    liveProjects.push(newProject);
}

export function updateProject(updatedProject: Project): void {
    const projectIndex = liveProjects.findIndex(p => p.id === updatedProject.id);
    if (projectIndex !== -1) {
        liveProjects[projectIndex] = updatedProject;
    }
}

// --- Task Data Access ---
export function getAllTasks(): Task[] {
    return liveTasks;
}

export function findTasksByProjectId(projectId: string): Task[] {
    return liveTasks.filter(t => t.projectId === projectId);
}

export function findTaskById(taskId: string): Task | undefined {
    return liveTasks.find(t => t.id === taskId);
}

export function addTask(newTask: Task): void {
    liveTasks.push(newTask);
}

export function updateTask(updatedTask: Task): void {
    const taskIndex = liveTasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
        liveTasks[taskIndex] = updatedTask;
    }
}

export function deleteTask(taskId: string): void {
    const taskIndex = liveTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        liveTasks.splice(taskIndex, 1);
    }
}


// --- Learning Progress Data Access ---
export function getAllUserLearningProgress(): UserLearningProgress[] {
    return liveUserLearningProgress;
}

export function findUserLearningProgress(userId: string, pathId: string): UserLearningProgress | undefined {
    return liveUserLearningProgress.find(p => p.userId === userId && p.pathId === pathId);
}

export function updateUserLearningProgress(progress: UserLearningProgress): void {
    const progressIndex = liveUserLearningProgress.findIndex(p => p.userId === progress.userId && p.pathId === progress.pathId);
    if (progressIndex !== -1) {
        liveUserLearningProgress[progressIndex] = progress;
    } else {
        liveUserLearningProgress.push(progress);
    }
}

export function getAllLearningPaths(): LearningPath[] {
    return liveLearningPaths;
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
