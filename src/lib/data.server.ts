
import 'server-only';
import admin from 'firebase-admin'; // Import the top-level admin object
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase.server';
import type { Project, User, Discussion, Notification, Task, LearningPath, UserLearningProgress, Tag, ProjectPathLink, ProjectTag } from './types';

// This file contains server-side data access functions.
// It uses the firebase-admin SDK and is designed to run in a Node.js environment.

// Export adminDb to be used for transactions in server actions
export { adminDb };

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

export async function findUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds || userIds.length === 0) {
        return [];
    }

    const users: User[] = [];
    for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        // CORRECTED: Use admin.firestore.FieldPath.documentId()
        const q = adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const userSnapshot = await q.get();
        const chunkUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        users.push(...chunkUsers);
    }

    return users;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const usersCol = adminDb.collection('users');
    const q = usersCol.where('email', '==', email).limit(1);
    const userSnapshot = await q.get();
    if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return undefined;
}

export async function findUsersByName(query: string): Promise<User[]> {
    if (!query) return [];
    const usersCol = adminDb.collection('users');

    const nameQuery = usersCol.where('name', '>=', query).where('name', '<=', query + '\uf8ff');
    const emailQuery = usersCol.where('email', '>=', query).where('email', '<=', query + '\uf8ff');

    const [nameSnapshot, emailSnapshot] = await Promise.all([
        nameQuery.get(),
        emailQuery.get(),
    ]);

    const usersMap = new Map<string, User>();
    nameSnapshot.docs.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;
        usersMap.set(user.id, user);
    });
    emailSnapshot.docs.forEach(doc => {
        const user = { id: doc.id, ...doc.data() } as User;
        usersMap.set(user.id, user);
    });

    return Array.from(usersMap.values());
}

export async function addUser(uid: string, newUser: Omit<User, 'id'>): Promise<void> {
    await adminDb.collection('users').doc(uid).set(newUser);
}

export async function updateUser(updatedUser: User): Promise<void> {
    const { id, ...userData } = updatedUser;
    const userRef = adminDb.collection('users').doc(id);
    await userRef.update(userData);
}

export async function deleteUser(userId: string): Promise<void> {
    if (!userId) return;
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.delete();
}

export async function logOrphanedUser(orphanedUserData: User): Promise<void> {
    const orphanedCol = adminDb.collection('users_orphaned');
    await orphanedCol.add({
        ...orphanedUserData,
        orphanedAt: FieldValue.serverTimestamp(),
    });
}

// --- Notification Data Access ---
export async function addNotification(notificationData: Omit<Notification, 'id'>): Promise<string> {
    const notificationRef = await adminDb.collection('notifications').add(notificationData);
    return notificationRef.id;
}

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
    const notificationsCol = adminDb.collection('notifications');
    const q = notificationsCol.where('userId', '==', userId).orderBy('timestamp', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}


// --- Project Data Access ---
export async function getAllProjects(): Promise<Project[]> {
    const projectsCol = adminDb.collection('projects');
    const tagsCol = adminDb.collection('tags');

    const [projectSnapshot, tagsSnapshot] = await Promise.all([
        projectsCol.get(),
        tagsCol.get()
    ]);

    const tagsMap = new Map<string, Tag>();
    tagsSnapshot.docs.forEach(doc => {
        const tag = { id: doc.id, ...doc.data() } as Tag;
        tagsMap.set(tag.id, tag);
    });

    const projectsWithTags = projectSnapshot.docs.map(doc => {
        const projectData = doc.data();
        const project = { id: doc.id, ...projectData } as Project;

        if (project.tags && Array.isArray(project.tags)) {
            // CORRECTED: Map full Tag objects to the simpler ProjectTag type
            const hydratedTags: ProjectTag[] = project.tags
                .map(projectTag => {
                    const fullTag = tagsMap.get(projectTag.id);
                    if (!fullTag) return null;
                    // Ensure the returned object matches the ProjectTag type exactly
                    return {
                        id: fullTag.id,
                        display: fullTag.display,
                        role: fullTag.type, 
                    };
                })
                .filter((tag): tag is ProjectTag => !!tag);
            
            project.tags = hydratedTags;
        } else {
            project.tags = [];
        }

        return project;
    });

    return projectsWithTags;
}

export async function findProjectById(projectId: string): Promise<Project | undefined> {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
        return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return undefined;
}

export async function addProject(newProjectData: Omit<Project, 'id'>): Promise<string> {
    const projectRef = await adminDb.collection('projects').add(newProjectData);
    return projectRef.id;
}

export async function updateProject(updatedProject: Project): Promise<void> {
    const { id, ...projectData } = updatedProject;
    const projectRef = adminDb.collection('projects').doc(id);
    await projectRef.update(projectData);
}

export async function addTeamMember(projectId: string, userId: string): Promise<void> {
    const project = await findProjectById(projectId);
    const user = await findUserById(userId);

    if (!project || !user) {
        throw new Error("Project or user not found");
    }

    const requiredBadgesSnapshot = await adminDb.collection('projectBadgeLinks').where('projectId', '==', projectId).where('isRequirement', '==', true).get();
    const requiredBadgeIds = requiredBadgesSnapshot.docs.map(doc => doc.data().badgeId);

    const userBadgesSnapshot = await adminDb.collection('userBadges').where('userId', '==', userId).get();
    const userBadgeIds = new Set(userBadgesSnapshot.docs.map(doc => doc.data().badgeId));

    const hasAllRequiredBadges = requiredBadgeIds.every(badgeId => userBadgeIds.has(badgeId));

    const role = hasAllRequiredBadges ? 'contributor' : 'participant';

    const updatedTeam = [...(project.team || []), { userId, role }];

    await adminDb.collection('projects').doc(projectId).update({ team: updatedTeam });
}


// --- Tag Data Access ---
export async function getAllTags(): Promise<Tag[]> {
    const tagsCol = adminDb.collection('tags').orderBy('usageCount', 'desc');
    const tagsSnapshot = await tagsCol.get();
    return tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

// --- Discussion Data Access ---
export async function addDiscussionComment(commentData: Omit<Discussion, 'id'>): Promise<string> {
    const commentRef = await adminDb.collection('discussions').add(commentData);
    return commentRef.id;
}

export async function getDiscussionsByProjectId(projectId: string): Promise<Discussion[]> {
    const discussionsCol = adminDb.collection('discussions');
    const q = discussionsCol.where('projectId', '==', projectId).orderBy('timestamp', 'asc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discussion));
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

export async function addTask(newTaskData: Omit<Task, 'id'>): Promise<string> {
    const taskRef = await adminDb.collection('tasks').add(newTaskData);
    return taskRef.id;
}

export async function updateTask(updatedTask: Task): Promise<void> {
    const { id, ...taskData } = updatedTask;
    const taskRef = adminDb.collection('tasks').doc(id);
    await taskRef.update(taskData);
}

export async function deleteTaskFromDb(taskId: string): Promise<void> {
    await adminDb.collection('tasks').doc(taskId).delete();
  }

// --- Learning Progress & Path Data Access ---

export async function findLearningPathsByIds(ids: string[]): Promise<LearningPath[]> {
    if (!ids || ids.length === 0) {
        return [];
    }
    const uniqueIds = [...new Set(ids)];
    const docRefs = uniqueIds.map(id => adminDb.collection('learningPaths').doc(id));
    const docs = await adminDb.getAll(...docRefs);

    return docs
        .map(doc => {
            if (!doc.exists) return null;
            const data = doc.data();
            return {
                pathId: doc.id, // Use the document's ID as the pathId
                title: data.title,
                description: data.description,
                duration: data.duration,
                category: data.category,
                Icon: data.Icon,
                modules: data.modules,
                ...data,
            } as LearningPath;

        })
        .filter((path): path is LearningPath => path !== null);
}


export async function getRecommendedPathIdsForProject(projectId: string): Promise<string[]> {
    const linksSnapshot = await adminDb.collection('projectPathLinks').where('projectId', '==', projectId).get();
    if (linksSnapshot.empty) {
        return [];
    }
    return linksSnapshot.docs.map(doc => doc.data().learningPathId as string);
}

export async function getAllProjectPathLinks(): Promise<ProjectPathLink[]> {
    const linksSnapshot = await adminDb.collection('projectPathLinks').get();
    return linksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            pathId: data.pathId, // Assuming pathId exists in doc.data()
            projectId: data.projectId, // Assuming projectId exists in doc.data()
            learningPathId: data.learningPathId, // Assuming learningPathId exists in doc.data()
            ...data, // Include any other properties from doc.data() that are in ProjectPathLink
        } as ProjectPathLink;
    });
}

export async function getRecommendedLearningPathsForProject(projectId: string): Promise<LearningPath[]> {
    const pathIds = await getRecommendedPathIdsForProject(projectId);
    if (pathIds.length === 0) {
        return [];
    }
    return findLearningPathsByIds(pathIds);
}

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
    // CORRECTED: Ensure the data is correctly cast to the LearningPath type
    return pathSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            pathId: doc.id, // Explicitly map id to pathId
            title: data.title,
            description: data.description,
            duration: data.duration,
            category: data.category,
            Icon: data.Icon,
            isLocked: data.isLocked,
            modules: data.modules,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as LearningPath;
    });
}
