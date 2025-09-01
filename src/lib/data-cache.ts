
import type { Project, User, Discussion, ProjectMember } from './types';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// In a real app, the current user ID would be determined from the session.
// For this prototype, we'll consistently use a hardcoded ID for stability.
export async function getCurrentUser(): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', 'u1'));
    if (!userDoc.exists()) {
        console.error("Could not find the default user (u1). Please ensure the database is seeded correctly.");
        return null;
    }
    return { id: userDoc.id, ...userDoc.data() } as User;
}

export async function getAllUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function hydrateProjectTeam(project: Project, allUsers: User[]): Promise<Project> {
    const team: ProjectMember[] = (project.team || []).map((m: any) => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { user, role: m.role } : null;
    }).filter((m): m is ProjectMember => m !== null);

    const discussions: Discussion[] = (project.discussions || []).map((d: any) => {
        const user = allUsers.find(u => u.id === d.userId);
        if (!user) return null;
        // Ensure a unique ID for each comment for React keys
        const timestamp = d.timestamp.toMillis ? d.timestamp.toMillis() : new Date(d.timestamp).getTime();
        return {
           id: `${d.userId}-${timestamp}`,
           user, 
           content: d.content, 
           timestamp: new Date(timestamp).toISOString(),
       };
   }).filter((d): d is Discussion => d !== null);

    return { ...project, team, discussions };
}
