
import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase.server';
import type { Project, User, Discussion, Notification, Task, LearningPath, UserLearningProgress, Tag, SelectableTag } from './types';

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

    // Fetch all projects and all tags in parallel
    const [projectSnapshot, tagsSnapshot] = await Promise.all([
        projectsCol.get(),
        tagsCol.get()
    ]);

    // Create a map of tag IDs to tag objects for efficient lookup
    const tagsMap = new Map<string, Tag>();
    tagsSnapshot.docs.forEach(doc => {
        const tag = { id: doc.id, ...doc.data() } as Tag;
        tagsMap.set(tag.id, tag);
    });

    // Process projects to embed the full tag objects
    const projectsWithTags = projectSnapshot.docs.map(doc => {
        const projectData = doc.data();
        const project = { id: doc.id, ...projectData } as Project;

        // The `tags` on the project are ProjectTag[], which may be stale or incomplete.
        if (project.tags && Array.isArray(project.tags)) {
            // Replace the partial ProjectTag objects with full, up-to-date Tag objects.
            const hydratedTags = project.tags
                .map(projectTag => tagsMap.get(projectTag.id)) // Find the full tag object from the map
                .filter((tag): tag is Tag => !!tag); // Filter out any tags that might not have been found
            
            project.tags = hydratedTags;
        } else {
            // Ensure the tags property is always an array.
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

// --- Tag Data Access ---
export async function getAllTags(): Promise<Tag[]> {
    const tagsCol = adminDb.collection('tags').orderBy('usageCount', 'desc');
    const tagsSnapshot = await tagsCol.get();
    return tagsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
}

/**
 * Synchronizes tags for a project, creating new tags and updating usage counts
 * within a single transaction.
 *
 * @param transaction - The Firestore transaction object.
 * @param projectId - The ID of the project being updated.
 * @param newTags - The new array of tags from the form.
 * @param currentTags - The array of tags currently on the project.
 * @returns The final, complete array of tags for the project.
 */
async function manageTagsForProject(
  transaction: FirebaseFirestore.Transaction,
  newTags: SelectableTag[],
  currentTags: Tag[]
): Promise<Tag[]> {
  const newTagIds = new Set(newTags.map(t => t.id));
  const currentTagIds = new Set(currentTags.map(t => t.id));

  const tagsToAdd = newTags.filter(t => !currentTagIds.has(t.id));
  const tagsToRemove = currentTags.filter(t => !newTagIds.has(t.id));
  const finalTags: Tag[] = [...newTags]; // Start with the desired state

  const tagsCollection = adminDb.collection('tags');

  // Process tags to add
  for (const tag of tagsToAdd) {
    const tagRef = tagsCollection.doc(tag.id);
    const tagSnap = await transaction.get(tagRef);
    if (tagSnap.exists) {
      // Tag exists, increment its usage count
      transaction.update(tagRef, { usageCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    } else {
      // New tag, create it
      transaction.set(tagRef, {
        id: tag.id,
        display: tag.display,
        type: tag.type, // <-- Add the type field
        usageCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // Process tags to remove
  for (const tag of tagsToRemove) {
    const tagRef = tagsCollection.doc(tag.id);
    // Decrement the usage count, but don't let it go below zero.
    transaction.update(tagRef, { usageCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
  }
  
  return finalTags;
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
