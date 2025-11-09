
import 'server-only';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from './firebase.server';
import type { Activity, Project, User, Discussion, Notification, Task, LearningPath, UserLearningProgress, Tag, ProjectPathLink, ProjectTag, Module, HydratedProject, HydratedProjectMember, ProjectMember } from './types';
import { serializeTimestamp } from './utils.server';

// This file contains server-side data access functions.

export { adminDb };

// --- Helper Functions ---

function ensureModulesHaveIds(path: LearningPath): LearningPath {
    if (path.modules && Array.isArray(path.modules)) {
        path.modules.forEach((module, index) => {
            if (!module.moduleId) {
                module.moduleId = `${path.pathId}-module-${index}`;
            }
        });
    }
    return path;
}

async function hydrateProject(project: Project): Promise<HydratedProject> {
    const uniqueTeamMembers = new Map<string, ProjectMember>();
    project.team.forEach(member => {
        uniqueTeamMembers.set(member.userId, member);
    });
    const uniqueTeam = Array.from(uniqueTeamMembers.values());
    const memberIds = uniqueTeam.map(member => member.userId);
    const allUserIds = [...new Set(project.ownerId ? [project.ownerId, ...memberIds] : memberIds)];

    if (allUserIds.length === 0) {
        return { ...project, owner: undefined, team: [] };
    }

    const users = await findUsersByIds(allUserIds);
    const usersMap = new Map(users.map(user => [user.id, user]));
    const owner = project.ownerId ? usersMap.get(project.ownerId) : undefined;
    
    const hydratedTeam = uniqueTeam.map((member): HydratedProjectMember => {
        const user = usersMap.get(member.userId);
        if (!user) {
            const placeholderUser: User = {
                id: member.userId, name: 'Unknown User', email: '',
                onboardingCompleted: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                role: 'guest', username: 'unknown', avatarUrl: '', bio: '', website: ''
            };
            return { ...member, user: placeholderUser };
        }
        return { ...member, user };
    });

    return { ...project, owner: owner, team: hydratedTeam };
}

// --- User Data Access ---

export async function getAllUsers(): Promise<User[]> {
    const userSnapshot = await adminDb.collection('users').get();
    return userSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as User;
    });
}

export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (userSnap.exists) {
        const data = userSnap.data();
        return { id: userSnap.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as User;
    }
    return undefined;
}

export async function createGuestUser(uid: string): Promise<User> {
    const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Guest User', username: 'guest', email: `${uid}@example.com`,
        role: 'guest', onboardingCompleted: false, avatarUrl: '', website: '', bio: '',
    };
    const userWithTimestamp = { ...newUser, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    await adminDb.collection('users').doc(uid).set(userWithTimestamp);
    const createdUser = await findUserById(uid);
    if (!createdUser) throw new Error('Failed to create or find guest user after creation.');
    return createdUser;
}

export async function findUsersByIds(userIds: string[]): Promise<User[]> {
    const validUserIds = userIds.filter(id => id);
    if (validUserIds.length === 0) return [];
    const uniqueIds = [...new Set(validUserIds)];
    const users: User[] = [];
    for (let i = 0; i < uniqueIds.length; i += 10) {
        const chunk = uniqueIds.slice(i, i + 10);
        if (chunk.length === 0) continue;
        const q = adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const userSnapshot = await q.get();
        userSnapshot.docs.forEach(doc => {
            const data = doc.data();
            users.push({ id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as User);
        });
    }
    return users;
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<void> {
    if (!userId || typeof userId !== 'string') {
        throw new Error('A valid, non-empty user ID must be provided to update a user.');
    }
    const userRef = adminDb.collection('users').doc(userId);
    const dataToUpdate = { ...userData, updatedAt: FieldValue.serverTimestamp() };
    delete (dataToUpdate as any).id;
    delete (dataToUpdate as any).createdAt;
    await userRef.update(dataToUpdate);
}

// --- Project Data Access ---

export async function getAllProjects(): Promise<HydratedProject[]> {
    const [projectSnapshot, tagsSnapshot] = await Promise.all([
        adminDb.collection('projects').get(),
        adminDb.collection('tags').get()
    ]);
    const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
    const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));
    const projectsWithTags = projectSnapshot.docs.map(doc => {
        const data = doc.data();
        const project = { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), startDate: serializeTimestamp(data.startDate), endDate: serializeTimestamp(data.endDate) } as Project;
        if (project.tags && Array.isArray(project.tags)) {
            project.tags = project.tags.map(projectTag => {
                const tagId = typeof projectTag === 'string' ? projectTag : (projectTag as ProjectTag).id;
                if (!tagId) return null;
                const fullTag = tagsMap.get(tagId);
                if (!fullTag) return null;
                return { id: fullTag.id, display: fullTag.display, type: fullTag.type };
            }).filter((tag): tag is ProjectTag => !!tag);
        } else {
            project.tags = [];
        }
        return project;
    });
    return Promise.all(projectsWithTags.map(hydrateProject));
}

export async function findProjectById(projectId: string): Promise<HydratedProject | undefined> {
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (projectSnap.exists) {
        const data = projectSnap.data();
        const project = { id: projectSnap.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), startDate: serializeTimestamp(data.startDate), endDate: serializeTimestamp(data.endDate) } as Project;
        if (project.tags && Array.isArray(project.tags)) {
            const tagsSnapshot = await adminDb.collection('tags').get();
            const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
            const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));
            project.tags = project.tags.map(projectTag => {
                const tagId = typeof projectTag === 'string' ? projectTag : (projectTag as ProjectTag).id;
                if (!tagId) return null;
                const fullTag = tagsMap.get(tagId);
                if (!fullTag) return null;
                return { id: fullTag.id, display: fullTag.display, type: fullTag.type };
            }).filter((tag): tag is ProjectTag => !!tag);
        }
        return hydrateProject(project);
    }
    return undefined;
}

export async function getProjectsByUserId(userId: string): Promise<HydratedProject[]> {
    const allProjects = await getAllProjects();
    const userProjects = allProjects.filter(project => {
        if (project.owner?.id === userId) {
            return true;
        }
        if (project.team.some(member => member.userId === userId)) {
            return true;
        }
        return false;
    });
    return userProjects;
}

export async function updateProjectInDb(projectId: string, project: Partial<Project>): Promise<void> {
    await adminDb.collection('projects').doc(projectId).update(project);
}

// --- Activity Functions ---

export async function getUserActivity(userId: string): Promise<Activity[]> {
    const userProjects = await getProjectsByUserId(userId);
    const projectIds = userProjects.map(p => p.id);

    const actorActivityQuery = adminDb.collection('activity')
        .where('actorId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50);

    const projectActivityQuery = projectIds.length > 0
        ? adminDb.collection('activity')
            .where('projectId', 'in', projectIds)
            .orderBy('timestamp', 'desc')
            .limit(50)
        : null;

    const [actorActivitySnapshot, projectActivitySnapshot] = await Promise.all([
        actorActivityQuery.get(),
        projectActivityQuery ? projectActivityQuery.get() : Promise.resolve(null)
    ]);

    const activitiesMap = new Map<string, Activity>();

    const processSnapshot = (snapshot: admin.firestore.QuerySnapshot | null) => {
        if (!snapshot) return;
        snapshot.docs.forEach(doc => {
            if (!activitiesMap.has(doc.id)) {
                const data = doc.data();
                activitiesMap.set(doc.id, {
                    ...data,
                    id: doc.id,
                    timestamp: serializeTimestamp(data.timestamp),
                } as Activity);
            }
        });
    };

    processSnapshot(actorActivitySnapshot);
    processSnapshot(projectActivitySnapshot);

    const mergedActivities = Array.from(activitiesMap.values());
    mergedActivities.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());

    return mergedActivities.slice(0, 50);
}

// --- Task Data Access ---

export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
    const taskSnapshot = await adminDb.collection('projects').doc(projectId).collection('tasks').get();
    return taskSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), dueDate: data.dueDate ? serializeTimestamp(data.dueDate) : undefined } as Task;
    });
}

export async function addTaskToDb(projectId: string, task: Omit<Task, 'id'>): Promise<string> {
    const taskRef = await adminDb.collection('projects').doc(projectId).collection('tasks').add(task);
    return taskRef.id;
}

export async function updateTaskInDb(projectId: string, taskId: string, task: Partial<Task>): Promise<void> {
    await adminDb.collection('projects').doc(projectId).collection('tasks').doc(taskId).update(task);
}

export async function deleteTaskFromDb(projectId: string, taskId: string): Promise<void> {
    await adminDb.collection('projects').doc(projectId).collection('tasks').doc(taskId).delete();
}

// --- Discussion Data Access ---

export async function getDiscussionsForProject(projectId: string): Promise<Discussion[]> {
    const discussionSnapshot = await adminDb.collection('projects').doc(projectId).collection('discussions').orderBy('createdAt', 'desc').get();
    return discussionSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as Discussion;
    });
}

export async function addDiscussionCommentToDb(projectId: string, comment: Omit<Discussion, 'id'>): Promise<string> {
    const commentRef = await adminDb.collection('projects').doc(projectId).collection('discussions').add(comment);
    return commentRef.id;
}

// --- Notification Data Access ---

export async function addNotificationToDb(notification: Omit<Notification, 'id'>): Promise<void> {
    await adminDb.collection('notifications').add(notification);
}

// --- Tag Data Access ---

export async function getAllTags(): Promise<Tag[]> {
    const tagsSnapshot = await adminDb.collection('tags').orderBy('usageCount', 'desc').get();
    return tagsSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as Tag;
    });
}

// --- Learning Path Data Access ---

export async function getRecommendedLearningPathsForProject(project: HydratedProject): Promise<LearningPath[]> {
    if (!project.tags || project.tags.length === 0) return [];
    return [];
}

export async function getAllLearningPaths(limitNum: number = 10, startAfterDoc?: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>): Promise<{ paths: LearningPath[], lastVisible: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null }> {
    let query = adminDb.collection('learningPaths').orderBy('createdAt', 'desc').limit(limitNum);
    if (startAfterDoc) query = query.startAfter(startAfterDoc);
    const pathSnapshot = await query.get();
    const paths = pathSnapshot.docs.map(doc => {
        const data = doc.data();
        let path = { pathId: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as LearningPath;
        return ensureModulesHaveIds(path);
    });
    const lastVisible = pathSnapshot.docs.length > 0 ? pathSnapshot.docs[pathSnapshot.docs.length - 1] : null;
    return { paths, lastVisible };
}

export async function getAllProjectPathLinks(): Promise<ProjectPathLink[]> {
    const linksSnapshot = await adminDb.collection('projectPathLinks').get();
    return linksSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, projectId: data.projectId, pathId: data.pathId, learningPathId: data.learningPathId, createdAt: serializeTimestamp(data.createdAt) } as ProjectPathLink;
    });
}

export async function findUserLearningProgress(userId: string, pathId: string): Promise<UserLearningProgress | undefined> {
    const progressSnap = await adminDb.collection('userLearningProgress').where('userId', '==', userId).where('pathId', '==', pathId).limit(1).get();
    if (progressSnap.empty) return undefined;
    const doc = progressSnap.docs[0];
    const data = doc.data();
    return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), startedAt: serializeTimestamp(data.startedAt), completedAt: data.completedAt ? serializeTimestamp(data.completedAt) : undefined } as UserLearningProgress;
}

export async function updateUserLearningProgress({ userId, pathId, moduleId, completed }: { userId: string; pathId: string; moduleId: string; completed: boolean; }): Promise<UserLearningProgress> {
    const progressQuery = adminDb.collection('userLearningProgress').where('userId', '==', userId).where('pathId', '==', pathId).limit(1);
    const progressSnap = await progressQuery.get();
    const now = FieldValue.serverTimestamp();
    const moduleUpdate = completed ? FieldValue.arrayUnion(moduleId) : FieldValue.arrayRemove(moduleId);

    let progressRef;
    if (progressSnap.empty) {
        progressRef = adminDb.collection('userLearningProgress').doc();
        await progressRef.set({ userId, pathId, completedModules: completed ? [moduleId] : [], startedAt: now, updatedAt: now, createdAt: now, status: 'in_progress' });
    } else {
        progressRef = progressSnap.docs[0].ref;
        await progressRef.update({ completedModules: moduleUpdate, updatedAt: now });
    }
    
    const updatedDoc = await progressRef.get();
    const data = updatedDoc.data()!;
    return { id: updatedDoc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), startedAt: serializeTimestamp(data.startedAt), completedAt: data.completedAt ? serializeTimestamp(data.completedAt) : undefined } as UserLearningProgress;
}


// --- AI Data Access ---

export async function getAiSuggestedProjects(currentUser: User, allProjects: HydratedProject[]): Promise<HydratedProject[] | null> {
    const userProjectIds = new Set(allProjects.filter(p => p.team.some(member => member.userId === currentUser.id)).map(p => p.id));
    const candidateProjects = allProjects.filter(p => !userProjectIds.has(p.id));
    const sortedProjects = candidateProjects.sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA; 
    });
    return sortedProjects.slice(0, 3);
}

// This function is new and needs to be implemented
export async function logOrphanedUser(user: User): Promise<void> {
    try {
        const orphanedUsersRef = adminDb.collection('orphanedUsers').doc(user.id);
        await orphanedUsersRef.set({
            ...user,
            orphanedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[AUTH_ACTION_TRACE] Logged orphaned user: ${user.email} (ID: ${user.id})`);
    } catch (error) {
        console.error(`[AUTH_ACTION_TRACE] Failed to log orphaned user: ${user.id}`, error);
    }
}
