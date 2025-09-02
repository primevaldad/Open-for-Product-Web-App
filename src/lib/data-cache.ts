
import type { Project, User, Discussion, ProjectMember } from './types';
import { mockUsers } from './mock-data';

// In a real app, the current user ID would be determined from a session.
// For this prototype, we'll consistently use a hardcoded ID to represent the logged-in user.
// The user switcher is being removed, so we no longer need a function to get ALL users here.
export function getCurrentUser(): User | null {
    // We will default to u1, but in a real app this would be dynamic based on the session
    const user = mockUsers.find(u => u.id === 'u1'); 
    if (!user) {
        console.error("Could not find the default user (u1). Please ensure the mock data is correct.");
        return null;
    }
    return user;
}


export function hydrateProjectTeam(project: Project): Project {
    const allUsers = mockUsers; // Still need all users to hydrate teams

    const team: ProjectMember[] = (project.team || []).map((m: any) => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { user, role: m.role } : null;
    }).filter((m): m is ProjectMember => m !== null);

    const discussions: Discussion[] = (project.discussions || []).map((d: any) => {
        const user = allUsers.find(u => u.id === d.userId);
        if (!user) return null;
        // Ensure a unique ID for each comment for React keys
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
