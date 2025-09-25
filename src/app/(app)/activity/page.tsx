
import type { User, Project, Task, LearningPath, UserLearningProgress, Module, TeamMember } from "@/lib/types";
import { getAllProjects, getAllTasks, getAllUsers, getAllUserLearningProgress, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import ActivityClientPage from "./activity-client-page";
import { updateTask, deleteTask } from "@/app/actions/projects";
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';

const toISOString = (timestamp: any): string | any => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    return timestamp;
};

async function getActivityPageData() {
    const rawCurrentUser = await getAuthenticatedUser();
    if (!rawCurrentUser) return { currentUser: null, projects: [], myTasks: [], learningPaths: [], userProgress: [], allUsers: [] };

    const [rawProjects, rawAllTasks, rawUserProgress, rawLearningPaths, rawAllUsers] = await Promise.all([
        getAllProjects(),
        getAllTasks(),
        getAllUserLearningProgress(),
        getAllLearningPaths(),
        getAllUsers(),
    ]);
    
    const myTasks = rawAllTasks.filter(t => t.assignedToId === rawCurrentUser.id);
    const filteredUserProgress = rawUserProgress.filter(p => p.userId === rawCurrentUser.id);

    return { 
        currentUser: rawCurrentUser, 
        projects: rawProjects, 
        myTasks: myTasks, 
        learningPaths: rawLearningPaths, 
        userProgress: filteredUserProgress,
        allUsers: rawAllUsers,
    };
}

// This page is now a Server Component that fetches data and passes it to a Client Component.
export default async function ActivityPage() {
  const { 
      currentUser: rawCurrentUser, 
      projects: rawProjects, 
      myTasks: rawMyTasks, 
      learningPaths: rawLearningPaths, 
      userProgress: rawUserProgress,
      allUsers: rawAllUsers,
  } = await getActivityPageData();

  if (!rawCurrentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading activity...</p>
      </div>
    );
  }
  
  // --- SERIALIZATION & DATA HYDRATION ---
  const currentUser = {
      ...rawCurrentUser,
      createdAt: toISOString(rawCurrentUser.createdAt),
      lastLogin: toISOString(rawCurrentUser.lastLogin),
  };

  const allUsers = rawAllUsers.map(user => ({
      ...user,
      createdAt: toISOString(user.createdAt),
      lastLogin: toISOString(user.lastLogin),
  }));

  const projects = rawProjects.map(p => {
      const teamWithUsers = (p.team || [])
        .map(member => {
            const user = allUsers.find(u => u.id === member.userId);
            return user ? { ...member, user } : null;
        })
        .filter((member): member is TeamMember & { user: User } => member !== null);

      return {
          ...p,
          createdAt: toISOString(p.createdAt),
          updatedAt: toISOString(p.updatedAt),
          startDate: p.startDate ? toISOString(p.startDate) : undefined,
          endDate: p.endDate ? toISOString(p.endDate) : undefined,
          tags: (p.tags || []).map(tag => ({
              ...tag,
              createdAt: toISOString(tag.createdAt),
              updatedAt: toISOString(tag.updatedAt),
          })),
          team: teamWithUsers, // Replace original team with the hydrated & filtered version
      };
  });

  const myTasks = rawMyTasks.map(t => ({
      ...t,
      createdAt: toISOString(t.createdAt),
      updatedAt: toISOString(t.updatedAt),
      // Also hydrate the assignedTo user for the task
      assignedTo: allUsers.find(u => u.id === t.assignedToId) ?? undefined,
  }));

  const learningPaths = rawLearningPaths.map(lp => ({
      ...lp,
      createdAt: toISOString(lp.createdAt),
      updatedAt: toISOString(lp.updatedAt),
      Icon: iconMap[lp.category as keyof typeof iconMap] || FlaskConical,
  }));

  const userProgress = rawUserProgress; // Assuming no timestamps in userProgress

  const completedModulesData = (userProgress || []).flatMap(progress =>
    (progress.completedModules || []).map(moduleId => {
      const path = learningPaths.find(p => p.id === progress.pathId);
      const module = path?.modules.find(m => m.id === moduleId);

      const serializablePath = path ? { id: path.id, title: path.title } : undefined;

      return { path: serializablePath, module };
    })
  ).filter((item): item is { path: { id: string; title: string; }; module: Module; } => !!(item.path && item.module));


  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Activity</h1>
        <div className="grid md:grid-cols-2 gap-6">
            <ActivityClientPage
                myTasks={myTasks}
                completedModulesData={completedModulesData}
                projects={projects}
                allUsers={allUsers}
                updateTask={updateTask}
                deleteTask={deleteTask}
            />
        </div>
    </div>
  );
}
