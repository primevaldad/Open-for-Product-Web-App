'server-only';

import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from './firebase.server';
import type { Activity, Project, User, Discussion, Notification, Task, LearningPath, UserLearningProgress, GlobalTag, ProjectPathLink, ProjectTag, Module, HydratedProject, HydratedProjectMember, ProjectMember, ProjectCollection, HydratedCollection, Post, FundryFundingGoal, FundryAllocation, FundryContribution, FundryLedgerEntry } from './types';
import { serializeTimestamp } from './utils.server';
import { extractId } from './slug';

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
    const team = Array.isArray(project.team) ? project.team : [];
    const uniqueTeamMembers = new Map<string, ProjectMember>();
    team.forEach(member => {
        const existing = uniqueTeamMembers.get(member.userId);
        if (existing) {
            const priority: Record<string, number> = { lead: 3, contributor: 2, participant: 1 };
            const existingPriority = priority[existing.role] || 0;
            const newPriority = priority[member.role] || 0;
            if (newPriority > existingPriority) {
                existing.role = member.role;
            }
            if (member.pendingRole) {
                existing.pendingRole = member.pendingRole;
            }
        } else {
            uniqueTeamMembers.set(member.userId, { ...member });
        }
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
    const users = userSnapshot.docs.map(doc => {
        const { embedding, ...data } = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as User;
    });
    return users.filter(user => user.name !== 'Guest User');
}

export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userSnap = await adminDb.collection('users').doc(userId).get();
    if (userSnap.exists) {
        const { embedding, ...data } = userSnap.data()!;
        return {
            id: userSnap.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
            // Convert to ISO string so it can cross the Server→Client boundary
            verificationEmailSentAt: data.verificationEmailSentAt
                ? serializeTimestamp(data.verificationEmailSentAt)
                : undefined,
        } as unknown as User;
    }
    return undefined;
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    const userQuery = adminDb.collection('users').where('username', '==', username).limit(1);
    const userSnapshot = await userQuery.get();
    if (userSnapshot.empty) {
        return undefined;
    }
    const userDoc = userSnapshot.docs[0];
    const { embedding, ...data } = userDoc.data();
    return {
        id: userDoc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        verificationEmailSentAt: data.verificationEmailSentAt
            ? serializeTimestamp(data.verificationEmailSentAt)
            : undefined,
    } as unknown as User;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const userQuery = adminDb.collection('users').where('email', '==', email).limit(1);
    const userSnapshot = await userQuery.get();
    if (userSnapshot.empty) {
        return undefined;
    }
    const userDoc = userSnapshot.docs[0];
    const { embedding, ...data } = userDoc.data();
    return {
        id: userDoc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        verificationEmailSentAt: data.verificationEmailSentAt
            ? serializeTimestamp(data.verificationEmailSentAt)
            : undefined,
    } as unknown as User;
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
            const { embedding, ...data } = doc.data();
            users.push({
                id: doc.id,
                ...data,
                createdAt: serializeTimestamp(data.createdAt),
                updatedAt: serializeTimestamp(data.updatedAt),
                verificationEmailSentAt: data.verificationEmailSentAt
                    ? serializeTimestamp(data.verificationEmailSentAt)
                    : undefined,
            } as unknown as User);
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

async function _fetchAllProjectsUnfiltered(): Promise<HydratedProject[]> {
    const [projectSnapshot, tagsSnapshot] = await Promise.all([
        adminDb.collection('projects').get(),
        adminDb.collection('tags').get()
    ]);
    const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalTag));
    const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));
    const projectsWithTags = projectSnapshot.docs.map(doc => {
        const { embedding, ...data } = doc.data();
        const project = { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), startDate: serializeTimestamp(data.startDate), endDate: serializeTimestamp(data.endDate) } as Project;
        if (project.tags && Array.isArray(project.tags)) {
            project.tags = project.tags.map(projectTag => {
                const tagId = (projectTag as ProjectTag).id;
                if (!tagId) return null;
                const fullTag = tagsMap.get(tagId);
                if (!fullTag) return { ...projectTag, isCategory: projectTag.isCategory || false };
                return { id: fullTag.id, display: fullTag.display, isCategory: fullTag.isCategory };
            }).filter((tag): tag is ProjectTag => !!tag);
        } else {
            project.tags = [];
        }
        return project;
    });
    return Promise.all(projectsWithTags.map(hydrateProject));
}

export async function getAllProjects(currentUser: User | null): Promise<HydratedProject[]> {
    const allProjects = await _fetchAllProjectsUnfiltered();
    if (!currentUser) {
        return allProjects.filter(p => p.project_type === 'public' || !p.project_type);
    }

    return allProjects.filter(project => {
        const projectType = project.project_type || 'public'; // Default to public

        switch (projectType) {
            case 'public':
                return true;
            case 'private':
                // Visible if user is a member of the team
                return project.team.some(member => member.userId === currentUser.id);
            case 'personal':
                // Visible only to the owner
                return project.owner?.id === currentUser.id;
            default:
                return true; // Default to visible for safety if type is unknown
        }
    });
}

export async function getAllPublishedProjects(currentUser: User | null): Promise<HydratedProject[]> {
    const [projectsSnap, tagsSnapshot] = await Promise.all([
        adminDb.collection('projects').where('status', '==', 'published').get(),
        adminDb.collection('tags').get()
    ]);

    if (projectsSnap.empty) {
        return [];
    }

    const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalTag));
    const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));

    const projectsWithTags = projectsSnap.docs.map(doc => {
        const { embedding, ...data } = doc.data();
        const project = {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
            startDate: serializeTimestamp(data.startDate),
            endDate: serializeTimestamp(data.endDate)
        } as Project;

        if (project.tags && Array.isArray(project.tags)) {
            project.tags = project.tags.map(projectTag => {
                const tagId = (projectTag as ProjectTag).id;
                if (!tagId) return null;
                const fullTag = tagsMap.get(tagId);
                if (!fullTag) return { ...projectTag, isCategory: projectTag.isCategory || false };
                return { id: fullTag.id, display: fullTag.display, isCategory: fullTag.isCategory };
            }).filter((tag): tag is ProjectTag => !!tag);
        } else {
            project.tags = [];
        }
        return project;
    });

    const allPublished = await Promise.all(projectsWithTags.map(project => hydrateProject(project)));

    if (!currentUser) {
        return allPublished.filter(p => p.project_type === 'public' || !p.project_type);
    }

    return allPublished.filter(project => {
        const projectType = project.project_type || 'public'; // Default to public

        switch (projectType) {
            case 'public':
                return true;
            case 'private':
                // Visible if user is a member of the team
                return project.team.some(member => member.userId === currentUser.id);
            case 'personal':
                // Visible only to the owner
                return project.owner?.id === currentUser.id;
            default:
                return true; // Default to visible for safety if type is unknown
        }
    });
}


export async function findProjectById(projectId: string, currentUser: User | null): Promise<HydratedProject | undefined> {
    if (!projectId) return undefined;
    const cleanId = extractId(projectId);
    const projectSnap = await adminDb.collection('projects').doc(cleanId).get();
    if (!projectSnap.exists) {
        return undefined;
    }

    const { embedding, ...data } = projectSnap.data() as Project;
    const projectData: Project = {
        id: projectSnap.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        startDate: serializeTimestamp(data.startDate),
        endDate: serializeTimestamp(data.endDate)
    };

    if (projectData.tags && Array.isArray(projectData.tags)) {
        const tagsSnapshot = await adminDb.collection('tags').get();
        const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalTag));
        const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));
        projectData.tags = projectData.tags.map(projectTag => {
            const tagId = (projectTag as ProjectTag).id;
            if (!tagId) return null;
            const fullTag = tagsMap.get(tagId);
            if (!fullTag) return { ...projectTag, isCategory: projectTag.isCategory || false };
            return { id: fullTag.id, display: fullTag.display, isCategory: fullTag.isCategory };
        }).filter((tag): tag is ProjectTag => !!tag);
    }

    const project = await hydrateProject(projectData);

    // Return project directly, bypassing visibility rules for now.
    return project;
}

export async function getProjectsByUserId(userId: string): Promise<HydratedProject[]> {
    const allProjects = await _fetchAllProjectsUnfiltered();
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

export async function getChildProjects(projectId: string): Promise<HydratedProject[]> {
    const snap = await adminDb.collection('projects')
        .where('parentProjectId', '==', projectId)
        .get();
    
    if (snap.empty) return [];
    
    // We can reuse the hydration logic but since we need full tag hydration, 
    // we'd normally just fetch them. To keep it simple, we can call findProjectById for each 
    // or just manually hydrate. For simplicity, we can just do manual hydration.
    // However, findProjectById is already available and does exactly this.
    // Let's use Promise.all(snap.docs.map(doc => findProjectById(doc.id, null)))
    
    const projects = await Promise.all(
        snap.docs.map(doc => findProjectById(doc.id, null))
    );
    
    return projects.filter((p): p is HydratedProject => p !== undefined);
}

export async function updateProjectInDb(projectId: string, project: Partial<Project>): Promise<void> {
    await adminDb.collection('projects').doc(projectId).update(project);
}

export async function updateProjectMemberRole({ projectId, userId, role, pendingRole, notificationLevel }: { projectId: string; userId: string; role?: ProjectMember['role']; pendingRole?: ProjectMember['role'] | null; notificationLevel?: 0 | 1 | 2 | 3 }): Promise<void> {
    const projectRef = adminDb.collection('projects').doc(projectId);
    await adminDb.runTransaction(async (transaction) => {
        const projectSnap = await transaction.get(projectRef);
        if (!projectSnap.exists) {
            throw new Error(`Project with id ${projectId} not found`);
        }

        const project = projectSnap.data() as Project;
        const team = project.team || [];
        const memberIndex = team.findIndex(member => member.userId === userId);

        if (memberIndex !== -1) {
            // Update existing member
            const updatedMember = { ...team[memberIndex] };
            let needsUpdate = false;

            if (role !== undefined) {
                updatedMember.role = role;
                needsUpdate = true;
            }

            if (pendingRole !== undefined) {
                if (pendingRole === null) {
                    delete (updatedMember as any).pendingRole;
                } else {
                    updatedMember.pendingRole = pendingRole;
                }
                needsUpdate = true;
            }

            if (notificationLevel !== undefined) {
                updatedMember.notificationLevel = notificationLevel;
                needsUpdate = true;
            }

            if (needsUpdate) {
                const newTeam = [...team];
                newTeam[memberIndex] = updatedMember;
                transaction.update(projectRef, { team: newTeam, updatedAt: FieldValue.serverTimestamp() });
            }
        } else if (role !== undefined || pendingRole !== undefined) {
            // Add new member if they don't exist, which happens during an application
            const newMember: ProjectMember = {
                userId,
                role: role || 'participant',
                createdAt: new Date().toISOString(),
            };
            if (pendingRole) {
                newMember.pendingRole = pendingRole;
            }
            const newTeam = [...team, newMember];
            transaction.update(projectRef, { team: newTeam, updatedAt: FieldValue.serverTimestamp() });
        }
    });
}


// --- Activity Functions ---

export async function getGlobalActivityFeed(): Promise<Activity[]> {
    const activitySnapshot = await adminDb.collection('activity')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    if (activitySnapshot.empty) {
        return [];
    }

    return activitySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type,
            actorId: data.actorId,
            timestamp: serializeTimestamp(data.timestamp),
            projectId: data.projectId,
            context: data.context || {},
        } as Activity;
    });
}

export async function getProjectActivityFeed(projectId: string): Promise<Activity[]> {
    const activitySnapshot = await adminDb.collection('activity')
        .where('projectId', '==', projectId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    if (activitySnapshot.empty) {
        return [];
    }

    return activitySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type,
            actorId: data.actorId,
            timestamp: serializeTimestamp(data.timestamp),
            projectId: data.projectId,
            context: data.context || {},
        } as Activity;
    });
}


// --- Task Data Access ---

export async function findTasksByProjectId(projectId: string): Promise<Task[]> {
    if (!projectId) return [];
    const taskSnapshot = await adminDb.collection('projects').doc(projectId).collection('tasks').get();
    return taskSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), dueDate: data.dueDate ? serializeTimestamp(data.dueDate) : undefined } as Task;
    });
}

export async function getTaskFromDb(projectId: string, taskId: string): Promise<Task | null> {
    const doc = await adminDb.collection('projects').doc(projectId).collection('tasks').doc(taskId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt), dueDate: data.dueDate ? serializeTimestamp(data.dueDate) : undefined } as Task;
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
    if (!projectId) return [];
    const discussionSnapshot = await adminDb.collection('projects').doc(projectId).collection('discussions').orderBy('createdAt', 'desc').get();
    return discussionSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as Discussion;
    });
}

export async function getDiscussionsByProjects(projectIds: string[]): Promise<Discussion[]> {
    if (!projectIds || projectIds.length === 0) return [];
    
    // Firestore does not support collection group queries with 'in' filter on parent document IDs directly in a simple way if they are subcollections.
    // However, we can iterate through projects and collect discussions, or use a flatter structure.
    // Given the current structure, we'll fetch them per project (up to 30 projects for MVP performance).
    
    const limitedIds = projectIds.slice(0, 30);
    const discussionPromises = limitedIds.map(id => getDiscussionsForProject(id));
    const allDiscussions = await Promise.all(discussionPromises);
    
    return allDiscussions.flat().sort((a, b) => 
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    ).slice(0, 100);
}

export async function addDiscussionCommentToDb(projectId: string, comment: Omit<Discussion, 'id'>): Promise<string> {
    const commentRef = await adminDb.collection('projects').doc(projectId).collection('discussions').add(comment);
    return commentRef.id;
}

// --- Notification Data Access ---

export async function addNotification(notification: Omit<Notification, 'id'>): Promise<void> {
    await adminDb.collection('notifications').add(notification);
}

// --- Tag Data Access ---

export async function getAllTags(): Promise<GlobalTag[]> {
    const tagsSnapshot = await adminDb.collection('tags').orderBy('usageCount', 'desc').get();
    return tagsSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as GlobalTag;
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

export async function findLearningPathsByIds(pathIds: string[]): Promise<LearningPath[]> {
    const validPathIds = pathIds.filter(id => id).map(id => extractId(id));
    if (validPathIds.length === 0) return [];
    const uniqueIds = [...new Set(validPathIds)];
    const paths: LearningPath[] = [];
    for (let i = 0; i < uniqueIds.length; i += 10) {
        const chunk = uniqueIds.slice(i, i + 10);
        if (chunk.length === 0) continue;
        const q = adminDb.collection('learningPaths').where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const pathSnapshot = await q.get();
        pathSnapshot.docs.forEach(doc => {
            const data = doc.data();
            let path = { pathId: doc.id, ...data, createdAt: serializeTimestamp(data.createdAt), updatedAt: serializeTimestamp(data.updatedAt) } as LearningPath;
            paths.push(ensureModulesHaveIds(path));
        });
    }
    return paths;
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
    return {
        id: doc.id,
        userId: data.userId,
        pathId: data.pathId,
        completedModules: data.completedModules,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        startedAt: serializeTimestamp(data.startedAt),
        lastAccessed: serializeTimestamp(data.updatedAt), // Map updatedAt to lastAccessed
        completedAt: data.completedAt ? serializeTimestamp(data.completedAt) : undefined
    } as UserLearningProgress;
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
    const { embedding, ...data } = updatedDoc.data()!;
    return { 
        id: updatedDoc.id, 
        ...data, 
        createdAt: serializeTimestamp(data.createdAt), 
        updatedAt: serializeTimestamp(data.updatedAt), 
        startedAt: serializeTimestamp(data.startedAt), 
        completedAt: data.completedAt ? serializeTimestamp(data.completedAt) : undefined 
    } as UserLearningProgress;
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



/**
 * Efficiently fetch project IDs for a given user without hydrating full projects.
 * Assumes each project document has a `memberIds` array field containing all user IDs
 * that are members of the project (including the owner).
 */
export async function getProjectIdsForUser(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    // Query projects where the user is the owner
    const ownedSnap = await adminDb.collection('projects')
      .where('ownerId', '==', userId)
      .select('__name__') // only fetch doc IDs
      .get();
    const ownedIds = ownedSnap.docs.map(d => d.id);

    // Query projects where the user is listed in memberIds array
    const memberSnap = await adminDb.collection('projects')
      .where('memberIds', 'array-contains', userId)
      .select('__name__')
      .get();
    const memberIds = memberSnap.docs.map(d => d.id);

    // Combine and dedupe
    const allIds = Array.from(new Set([...ownedIds, ...memberIds]));
    return allIds;
  } catch (e) {
    console.error('Failed to fetch project IDs for user', e);
    return [];
  }
}

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

// --- Collection Data Access ---

/** Serialize a raw Firestore collection document into a typed ProjectCollection. */
function serializeCollection(id: string, data: admin.firestore.DocumentData): ProjectCollection {
    return {
        id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? '',
        coverImageUrl: data.coverImageUrl,
        ownerId: data.ownerId,
        visibility: data.visibility ?? 'public',
        curationMode: data.curationMode ?? 'manual',
        memberProjectIds: Array.isArray(data.memberProjectIds) ? data.memberProjectIds : [],
        tagRule: data.tagRule,
        semanticQuery: data.semanticQuery,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
    };
}

/** Hydrate a ProjectCollection by resolving owner + member projects. */
async function hydrateCollection(collection: ProjectCollection): Promise<HydratedCollection> {
    const [owner, projects] = await Promise.all([
        findUserById(collection.ownerId),
        collection.memberProjectIds.length > 0
            ? _fetchProjectsByIds(collection.memberProjectIds)
            : Promise.resolve([]),
    ]);

    const placeholderOwner: User = {
        id: collection.ownerId,
        name: 'Unknown User',
        email: '',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const { ownerId: _ownerId, ...rest } = collection;
    return {
        ...rest,
        owner: owner ?? placeholderOwner,
        projects,
    };
}

/**
 * Fetch and hydrate a specific list of project IDs.
 * Projects that no longer exist are silently omitted.
 */
async function _fetchProjectsByIds(projectIds: string[]): Promise<HydratedProject[]> {
    const unique = [...new Set(projectIds)].filter(Boolean);
    if (unique.length === 0) return [];

    // Firestore 'in' queries are limited to 30 items per call
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 30) {
        chunks.push(unique.slice(i, i + 30));
    }

    const [tagsSnapshot] = await Promise.all([adminDb.collection('tags').get()]);
    const tagsData = tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GlobalTag));
    const tagsMap = new Map(tagsData.map(tag => [tag.id, tag]));

    const projects: HydratedProject[] = [];
    for (const chunk of chunks) {
        const snap = await adminDb
            .collection('projects')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();

        const hydrated = await Promise.all(
            snap.docs.map(doc => {
                const { embedding, ...data } = doc.data();
                const project = {
                    id: doc.id,
                    ...data,
                    createdAt: serializeTimestamp(data.createdAt),
                    updatedAt: serializeTimestamp(data.updatedAt),
                    startDate: serializeTimestamp(data.startDate),
                    endDate: serializeTimestamp(data.endDate),
                    tags: Array.isArray(data.tags)
                        ? data.tags
                              .map((pt: ProjectTag) => {
                                  const full = tagsMap.get(pt.id);
                                  if (!full) return null;
                                  return { id: full.id, display: full.display, isCategory: full.isCategory };
                              })
                              .filter((t: ProjectTag | null): t is ProjectTag => !!t)
                        : [],
                } as Project;
                return hydrateProject(project);
            })
        );
        projects.push(...hydrated);
    }

    // Restore the caller's requested order
    const projectMap = new Map(projects.map(p => [p.id, p]));
    return unique.map(id => projectMap.get(id)).filter((p): p is HydratedProject => !!p);
}

export async function getAllPublicCollections(): Promise<ProjectCollection[]> {
    const snap = await adminDb
        .collection('collections')
        .where('visibility', '==', 'public')
        .get();
    const collections = snap.docs.map(doc => serializeCollection(doc.id, doc.data()));
    return collections.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
}

export async function findCollectionBySlug(
    slug: string,
    currentUserId?: string
): Promise<ProjectCollection | undefined> {
    const snap = await adminDb
        .collection('collections')
        .where('slug', '==', slug)
        .limit(1)
        .get();
    if (snap.empty) return undefined;
    const doc = snap.docs[0];
    const collection = serializeCollection(doc.id, doc.data());

    // Visibility gate
    if (collection.visibility === 'private' && collection.ownerId !== currentUserId) {
        return undefined;
    }
    return collection;
}

export async function findCollectionById(
    id: string,
    currentUserId?: string
): Promise<ProjectCollection | undefined> {
    if (!id) return undefined;
    const cleanId = extractId(id);
    const snap = await adminDb
        .collection('collections')
        .doc(cleanId)
        .get();
    if (!snap.exists) return undefined;
    const collection = serializeCollection(snap.id, snap.data()!);

    // Visibility gate
    if (collection.visibility === 'private' && collection.ownerId !== currentUserId) {
        return undefined;
    }
    return collection;
}

export async function findCollectionsByOwner(ownerId: string): Promise<ProjectCollection[]> {
    const snap = await adminDb
        .collection('collections')
        .where('ownerId', '==', ownerId)
        .get();
    const collections = snap.docs.map(doc => serializeCollection(doc.id, doc.data()));
    return collections.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
}

export async function hydrateCollectionData(collection: ProjectCollection): Promise<HydratedCollection> {
    return hydrateCollection(collection);
}

export async function createCollection(
    data: Omit<ProjectCollection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProjectCollection> {
    // Ensure slug uniqueness
    const existing = await adminDb
        .collection('collections')
        .where('slug', '==', data.slug)
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new Error(`A collection with slug "${data.slug}" already exists.`);
    }

    const ref = adminDb.collection('collections').doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({ ...data, createdAt: now, updatedAt: now });

    const created = await ref.get();
    return serializeCollection(created.id, created.data()!);
}

export async function updateCollection(
    collectionId: string,
    updates: Partial<Omit<ProjectCollection, 'id' | 'ownerId' | 'createdAt'>>
): Promise<void> {
    const ref = adminDb.collection('collections').doc(collectionId);
    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
}

export async function addProjectToCollection(
    collectionId: string,
    projectId: string
): Promise<void> {
    const ref = adminDb.collection('collections').doc(collectionId);
    await ref.update({
        memberProjectIds: FieldValue.arrayUnion(projectId),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function removeProjectFromCollection(
    collectionId: string,
    projectId: string
): Promise<void> {
    const ref = adminDb.collection('collections').doc(collectionId);
    await ref.update({
        memberProjectIds: FieldValue.arrayRemove(projectId),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteCollection(collectionId: string): Promise<void> {
    await adminDb.collection('collections').doc(collectionId).delete();
}

// --- Post Data Access ---

export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const postRef = adminDb.collection('posts').doc();
    const now = FieldValue.serverTimestamp();
    await postRef.set({
        ...postData,
        status: postData.status || 'published',
        createdAt: now,
        updatedAt: now,
    });
    return postRef.id;
}

export async function findPostById(postId: string): Promise<Post | undefined> {
    if (!postId) return undefined;
    const doc = await adminDb.collection('posts').doc(postId).get();
    if (!doc.exists) return undefined;
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt)
    } as Post;
}

export async function updatePost(postId: string, updates: Partial<Post>): Promise<void> {
    const postRef = adminDb.collection('posts').doc(postId);
    const dataToUpdate = { ...updates, updatedAt: FieldValue.serverTimestamp() };
    delete (dataToUpdate as any).id;
    delete (dataToUpdate as any).createdAt;
    await postRef.update(dataToUpdate);
}

export async function deletePost(postId: string): Promise<void> {
    await adminDb.collection('posts').doc(postId).delete();
}


export async function getPostsByProject(projectId: string): Promise<Post[]> {
    const snapshot = await adminDb.collection('posts')
        .where('projectId', '==', projectId)
        .orderBy('createdAt', 'desc')
        .get();
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt)
        } as Post;
    });
}

export async function getFeedPosts(projectIds: string[]): Promise<Post[]> {
    if (!projectIds || projectIds.length === 0) return [];
    
    // Firestore 'in' queries are limited to 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < projectIds.length; i += 30) {
        chunks.push(projectIds.slice(i, i + 30));
    }
    
    const allPosts: Post[] = [];
    for (const chunk of chunks) {
        const snapshot = await adminDb.collection('posts')
            .where('projectId', 'in', chunk)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: serializeTimestamp(data.createdAt),
                updatedAt: serializeTimestamp(data.updatedAt)
            } as Post;
        }).filter(post => post.status !== 'draft');
        allPosts.push(...posts);
    }
    
    return allPosts.sort((a, b) => 
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    ).slice(0, 100);
}

export async function getRecentPublishedPosts(limitCount: number = 50): Promise<Post[]> {
    const snapshot = await adminDb.collection('posts')
        .where('status', '!=', 'draft')
        .orderBy('status')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
        
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt)
        } as Post;
    }).sort((a, b) => 
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );
}

export async function getRecentDiscussions(limitCount: number = 50): Promise<Discussion[]> {
    const snapshot = await adminDb.collection('discussions')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
        
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt)
        } as Discussion;
    });
}

// --- Following Data Access ---

export async function toggleFollowProject(userId: string, projectId: string): Promise<{ isFollowing: boolean }> {
    const userRef = adminDb.collection('users').doc(userId);
    
    return await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error('User not found');
        
        const userData = userDoc.data() as User;
        const followedIds = userData.followedProjectIds || [];
        const isFollowing = followedIds.includes(projectId);
        
        if (isFollowing) {
            transaction.update(userRef, {
                followedProjectIds: FieldValue.arrayRemove(projectId),
                updatedAt: FieldValue.serverTimestamp()
            });
            return { isFollowing: false };
        } else {
            transaction.update(userRef, {
                followedProjectIds: FieldValue.arrayUnion(projectId),
                updatedAt: FieldValue.serverTimestamp()
            });
            return { isFollowing: true };
        }
    });
}
export async function hasNewCommunityContent(userId: string, followedProjectIds: string[], lastSeenAt?: string): Promise<boolean> {
    if (!followedProjectIds || followedProjectIds.length === 0) return false;
    
    const lastSeenDate = lastSeenAt ? new Date(lastSeenAt) : new Date(0);
    
    // Check for posts in followed projects
    // We only need to know if AT LEAST ONE post exists since lastSeenDate
    const postsQuery = adminDb.collection('posts')
        .where('projectId', 'in', followedProjectIds.slice(0, 10)) // Limit to 10 for performance in sidebar check
        .where('createdAt', '>', lastSeenDate)
        .limit(1);
    
    const postsSnapshot = await postsQuery.get();
    if (!postsSnapshot.empty) return true;
    
    // Check for discussions in followed projects
    // Since discussions are subcollections, we'd need to iterate or use a collection group query if enabled
    // For now, let's just check posts as the primary indicator for "Community Feed" updates
    
    return false;
}

export async function getFundingGoalsForProject(projectId: string): Promise<FundryFundingGoal[]> {
    const snap = await adminDb.collection('projects').doc(projectId).collection('fundingGoals').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
        const d = doc.data();
        return {
            ...d,
            createdAt: serializeTimestamp(d.createdAt),
            updatedAt: serializeTimestamp(d.updatedAt),
            dueDate: d.dueDate ? serializeTimestamp(d.dueDate) : null
        } as FundryFundingGoal;
    });
}

export async function getFundingAllocationsForProject(projectId: string): Promise<FundryAllocation[]> {
    const snap = await adminDb.collection('projects').doc(projectId).collection('fundingAllocations').get();
    return snap.docs.map(doc => {
        const d = doc.data();
        return {
            ...d,
            allocatedAt: serializeTimestamp(d.allocatedAt),
            editableUntil: serializeTimestamp(d.editableUntil),
            lockedAt: d.lockedAt ? serializeTimestamp(d.lockedAt) : null,
            createdAt: serializeTimestamp(d.createdAt),
            updatedAt: serializeTimestamp(d.updatedAt)
        } as FundryAllocation;
    });
}

export async function getFundingContributionsForProject(projectId: string): Promise<FundryContribution[]> {
    const snap = await adminDb.collection('projects').doc(projectId).collection('fundingContributions').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
        const d = doc.data();
        return {
            ...d,
            createdAt: serializeTimestamp(d.createdAt),
            confirmedAt: d.confirmedAt ? serializeTimestamp(d.confirmedAt) : null
        } as FundryContribution;
    });
}

export async function getFundingLedgerForProject(projectId: string): Promise<FundryLedgerEntry[]> {
    const snap = await adminDb.collection('projects').doc(projectId).collection('fundingLedger').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
        const d = doc.data();
        return {
            ...d,
            createdAt: serializeTimestamp(d.createdAt)
        } as FundryLedgerEntry;
    });
}
