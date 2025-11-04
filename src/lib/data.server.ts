
import 'server-only';
import admin from 'firebase-admin'; // Import the top-level admin object
import { FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from './firebase.server';
import type { Project, User, Discussion, Notification, Task, LearningPath, UserLearningProgress, Tag, ProjectPathLink, ProjectTag, Module, HydratedProject } from './types';
import { serializeTimestamp } from './utils.server';

// This file contains server-side data access functions.
// It uses the firebase-admin SDK and is designed to run in a Node.js environment.

// Export adminDb to be used for transactions in server actions
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

// --- User Data Access ---

export async function getAllUsers(): Promise<User[]> {
    const usersCol = adminDb.collection('users');
    const userSnapshot = await usersCol.get();
    return userSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
        } as User;
    });
}

export async function findUserById(userId: string): Promise<User | undefined> {
    if (!userId) return undefined;
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const data = userSnap.data();
        return {
            id: userSnap.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
        } as User;
    }
    return undefined;
}

export async function createGuestUser(uid: string): Promise<User> {
    const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Guest User',
        username: 'guest',
        email: `${uid}@example.com`, // Temporary unique email
        role: 'guest',
        onboardingCompleted: false,
    };

    const userWithTimestamp = {
        ...newUser,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('users').doc(uid).set(userWithTimestamp);

    // Fetch the user we just created to get the serialized, server-generated timestamps
    const createdUser = await findUserById(uid);
    if (!createdUser) {
        throw new Error('Failed to create or find guest user after creation.');
    }

    return createdUser;
}

export async function findUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds || userIds.length === 0) {
        return [];
    }

    const users: User[] = [];
    for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        const q = adminDb.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk);
        const userSnapshot = await q.get();
        const chunkUsers = userSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: serializeTimestamp(data.createdAt),
                updatedAt: serializeTimestamp(data.updatedAt),
            } as User;
        });
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
        const data = userDoc.data();
        return {
            id: userDoc.id,
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
        } as User;
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
        const data = doc.data();
        const user = { 
            id: doc.id, 
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
        } as User;
        usersMap.set(user.id, user);
    });
    emailSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const user = { 
            id: doc.id, 
            ...data,
            createdAt: serializeTimestamp(data.createdAt),
            updatedAt: serializeTimestamp(data.updatedAt),
        } as User;
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

// --- Notification Data Access -- -
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


// --- Project Data Access -- -
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
            const hydratedTags: ProjectTag[] = project.tags
                .map(projectTag => {
                    // If the project tag is just a string, convert it to a ProjectTag object
                    if (typeof projectTag === 'string') {
                        const fullTag = tagsMap.get(projectTag);
                        if (!fullTag) return null;
                        return {
                            id: fullTag.id,
                            display: fullTag.display,
                            type: fullTag.type,
                        };
                    }
                    // If the project tag is already an object, use it directly
                    return projectTag;
                })
                .filter((tag): tag is ProjectTag => !!tag);
            
            project.tags = hydratedTags;
        } else {
            // Ensure project.tags is always an array
            project.tags = [];
        }

        return project;
    });

    return projectsWithTags;
}

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
    if (!userId) return [];
    const projectsCol = adminDb.collection('projects');
    const q = projectsCol.where('memberIds', 'array-contains', userId);
    const projectSnapshot = await q.get();
    return projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getProjectsByOwnerId(ownerId: string): Promise<Project[]> {
    if (!ownerId) return [];
    const projectsCol = adminDb.collection('projects');
    const q = projectsCol.where('ownerId', '==', ownerId);
    const projectSnapshot = await q.get();
    return projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function findProjectById(projectId: string): Promise<Project | undefined> {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();

    if (projectSnap.exists) {
        const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

        // Hydrate the tags to ensure they conform to the ProjectTag type
        if (project.tags && Array.isArray(project.tags)) {
            const tagsCol = adminDb.collection('tags');
            const tagsSnapshot = await tagsCol.get();
            const tagsMap = new Map<string, Tag>();
            tagsSnapshot.docs.forEach(doc => {
                const tag = { id: doc.id, ...doc.data() } as Tag;
                tagsMap.set(tag.id, tag);
            });

            const hydratedTags: ProjectTag[] = project.tags
                .map(projectTag => {
                    const tagId = typeof projectTag === 'string' ? projectTag : (projectTag as ProjectTag).id;
                    if (!tagId) return null;

                    const fullTag = tagsMap.get(tagId);
                    if (!fullTag) return null;

                    return {
                        id: fullTag.id,
                        display: fullTag.display,
                        type: fullTag.type,
                    };
                })
                .filter((tag): tag is ProjectTag => !!tag);

            project.tags = hydratedTags;
        } else {
            project.tags = [];
        }

        return project;
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


// --- Tag Data Access -- -
export async function getAllTags(): Promise<Tag[]> {
    const tagsCol = adminDb.collection('tags').orderBy('usageCount', 'desc');
    const tagsSnapshot = await tagsCol.get();
    return tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

// --- Discussion Data Access -- -
export async function addDiscussionComment(commentData: Omit<Discussion, 'id'>): Promise<Discussion> {
    // Add server timestamps here before writing to Firestore
    const newCommentData = {
        ...commentData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const commentRef = await adminDb.collection('discussions').add(newCommentData);
    const commentSnap = await commentRef.get();
    const createdComment = commentSnap.data();

    // Return the full discussion object, including the generated ID and server timestamps
    return { id: commentRef.id, ...createdComment } as Discussion;
}

export async function getDiscussionsForProjectId(projectId: string): Promise<Discussion[]> {
    const discussionsCol = adminDb.collection('discussions');
    const q = discussionsCol.where('projectId', '==', projectId).orderBy('timestamp', 'asc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discussion));
}

export async function getDiscussionsByUserId(userId: string): Promise<Discussion[]> {
    const discussionsCol = adminDb.collection('discussions');
    const q = discussionsCol.where('userId', '==', userId).orderBy('timestamp', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discussion));
}

export const getDiscussionsForProject = getDiscussionsForProjectId;


// --- Task Data Access -- -
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

export async function getTasksCreatedByUser(userId: string): Promise<Task[]> {
    const tasksCol = adminDb.collection('tasks');
    const q = tasksCol.where("createdBy", "==", userId);
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

export async function addTask(newTaskData: Omit<Task, 'id'>): Promise<Task> {
    // Add server timestamps here before writing to Firestore
    const taskWithTimestamps = {
        ...newTaskData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const taskRef = await adminDb.collection('tasks').add(taskWithTimestamps);
    const taskSnap = await taskRef.get();
    return { id: taskRef.id, ...taskSnap.data() } as Task;
}

export async function updateTask(updatedTask: Task): Promise<Task> {
    const { id, ...taskData } = updatedTask;
    const taskRef = adminDb.collection('tasks').doc(id);
    await taskRef.update(taskData);
    // Return the updated task
    return updatedTask;
}

export async function deleteTaskFromDb(taskId: string): Promise<void> {
    await adminDb.collection('tasks').doc(taskId).delete();
  }

// --- User Activity Data Access ---
export async function getUserActivity(userId: string) {
    const [ownedProjects, tasks, discussions, notifications] = await Promise.all([
        getProjectsByOwnerId(userId),
        getTasksCreatedByUser(userId),
        getDiscussionsByUserId(userId),
        getNotificationsByUserId(userId)
    ]);

    return {
        projects: ownedProjects,
        tasks,
        discussions,
        notifications,
    };
}

// --- Learning Progress & Path Data Access -- -

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
            let path = {
                pathId: doc.id, // Use the document's ID as the pathId
                ...doc.data(),
            } as LearningPath;
            
            path = ensureModulesHaveIds(path);

            return path;
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
            pathId: data.pathId, 
            projectId: data.projectId, 
            learningPathId: data.learningPathId, 
            ...data, 
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

export async function getAllLearningPaths(limitNum: number = 10, startAfterDoc?: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>): Promise<{ paths: LearningPath[], lastVisible: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData> | null }> {
    let query = adminDb.collection('learningPaths').orderBy('createdAt', 'desc').limit(limitNum);
    
    if (startAfterDoc) {
        query = query.startAfter(startAfterDoc);
    }

    const pathSnapshot = await query.get();
    const paths = pathSnapshot.docs.map(doc => {
        let path = {
            pathId: doc.id,
            ...doc.data(),
            createdAt: serializeTimestamp(doc.data().createdAt),
            updatedAt: serializeTimestamp(doc.data().updatedAt),
        } as LearningPath;
        
        path = ensureModulesHaveIds(path);

        return path;
    });

    const lastVisible = pathSnapshot.docs.length > 0 ? pathSnapshot.docs[pathSnapshot.docs.length - 1] : null;

    return { paths, lastVisible };
}


// --- AI Data Access ---

async function getFallbackSuggestedProjects(
    currentUser: User,
    allProjects: HydratedProject[]
  ): Promise<HydratedProject[]> {
    const userProjectIds = new Set(
      allProjects.filter(p => p.team.some(member => member.userId === currentUser.id)).map(p => p.id)
    );
  
    const candidateProjects = allProjects.filter(p => !userProjectIds.has(p.id));
  
    // Sort by most recent
    const sortedProjects = candidateProjects.sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA; 
    });

    return sortedProjects.slice(0, 3);
  }

export async function getAiSuggestedProjects(
    currentUser: User,
    allProjects: HydratedProject[]
  ): Promise<HydratedProject[] | null> {
    if (process.env.AI_SUGGESTIONS_ENABLED !== 'true' || !currentUser.aiFeaturesEnabled) {
        console.log("AI suggestions are disabled. Returning fallback suggestions.");
        return getFallbackSuggestedProjects(currentUser, allProjects);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Skipping AI project suggestions.");
      return null;
    }
  
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
      const userProjectIds = new Set(
          allProjects.filter(p => p.team.some(member => member.userId === currentUser.id)).map(p => p.id)
      );
      const candidateProjects = allProjects.filter(p => !userProjectIds.has(p.id));
  
      const projectsForPrompt = candidateProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        tags: p.tags.map(t => t.display),
      }));
  
      const userProfile = {
        name: currentUser.name,
      };
  
      const prompt = `
        You are an expert project recommender for a developer collaboration platform.
        Your task is to recommend the top 3 most relevant projects for a user from the provided list.
        
        Here is the user's profile:
        ${JSON.stringify(userProfile, null, 2)}
  
        Here is the list of available projects:
        ${JSON.stringify(projectsForPrompt, null, 2)}
  
        Based on the user's profile and the project descriptions and tags, please suggest the 3 best projects for them to join.
        
        Respond with ONLY a JSON array of the project IDs, ordered by relevance (most relevant first). For example: ["project-id-1", "project-id-2", "project-id-3"]
      `;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
  
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const recommendedIds = JSON.parse(cleanedText) as string[];
  
      if (!Array.isArray(recommendedIds)) {
          throw new Error("AI response was not a valid array of project IDs.");
      }
  
      const allProjectsMap = new Map(allProjects.map(p => [p.id, p]));
      
      const recommendedProjects = recommendedIds
          .map(id => allProjectsMap.get(id))
          .filter((p): p is HydratedProject => !!p); 
  
      return recommendedProjects;
  
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      return null;
    }
  }
