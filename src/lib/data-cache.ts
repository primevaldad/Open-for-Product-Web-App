
import type { Project, User, Discussion, ProjectMember, Task, LearningPath, UserLearningProgress } from './types';
import { mockUsers, mockProjects, mockTasks, mockLearningPaths, mockUserLearningProgress } from './mock-data';

// --- Persistent In-Memory "Database" ---
// This layer now directly interacts with the imported mock data arrays,
// treating them as a persistent, in-memory database. Changes made via
// the update functions will modify these arrays directly and will
// persist for the lifetime of the server process.

// --- User Data Access ---
export function getAllUsers(): User[] {
    return mockUsers;
}

export function findUserById(userId: string): User | undefined {
    return mockUsers.find(u => u.id === userId);
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
    const userIndex = mockUsers.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        mockUsers[userIndex] = updatedUser;
    }
}

// --- Project Data Access ---
export function getAllProjects(): Project[] {
    return mockProjects;
}

export function findProjectById(projectId: string): Project | undefined {
    return mockProjects.find(p => p.id === projectId);
}

export function addProject(newProject: Project): void {
    mockProjects.push(newProject);
}

export function updateProject(updatedProject: Project): void {
    const projectIndex = mockProjects.findIndex(p => p.id === updatedProject.id);
    if (projectIndex !== -1) {
        mockProjects[projectIndex] = updatedProject;
    }
}

// --- Task Data Access ---
export function getAllTasks(): Task[] {
    return mockTasks;
}

export function findTasksByProjectId(projectId: string): Task[] {
    return mockTasks.filter(t => t.projectId === projectId);
}

export function findTaskById(taskId: string): Task | undefined {
    return mockTasks.find(t => t.id === taskId);
}

export function addTask(newTask: Task): void {
    mockTasks.push(newTask);
}

export function updateTask(updatedTask: Task): void {
    const taskIndex = mockTasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
        mockTasks[taskIndex] = updatedTask;
    }
}

export function deleteTask(taskId: string): void {
    const taskIndex = mockTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        mockTasks.splice(taskIndex, 1);
    }
}


// --- Learning Progress Data Access ---
export function getAllUserLearningProgress(): UserLearningProgress[] {
    return mockUserLearningProgress;
}

export function findUserLearningProgress(userId: string, pathId: string): UserLearningProgress | undefined {
    return mockUserLearningProgress.find(p => p.userId === userId && p.pathId === pathId);
}

export function updateUserLearningProgress(progress: UserLearningProgress): void {
    const progressIndex = mockUserLearningProgress.findIndex(p => p.userId === progress.userId && p.pathId === progress.pathId);
    if (progressIndex !== -1) {
        mockUserLearningProgress[progressIndex] = progress;
    } else {
        mockUserLearningProgress.push(progress);
    }
}

export function getAllLearningPaths(): LearningPath[] {
    return mockLearningPaths;
}

// --- Data Hydration ---
// This function remains crucial for combining raw data from different "tables" into rich objects for the UI.
export function hydrateProjectTeam(project: Project): Project {
    const allUsers = getAllUsers();

    const team: ProjectMember[] = (project.team || []).map((m: any) => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { user, role: m.role, userId: user.id } : null;
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
           userId: user.id,
       };
   }).filter((d): d is Discussion => d !== null);

    return { ...project, team, discussions };
}
