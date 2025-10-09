
import type { User, Project, ProjectMember } from "@/lib/types"; // Cleaned up unused imports
import { getAllProjects, getAllTasks, getAllUsers, getAllUserLearningProgress, getAllLearningPaths } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import ActivityClientPage from "./activity-client-page";
import { updateTask as updateTaskAction, deleteTask as deleteTaskAction } from "@/app/actions/projects";
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';
import type { CompletedModuleData } from "@/lib/types";
import { serializeTimestamp } from "@/lib/utils"; // Import centralized helper

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
        myTasks, 
        learningPaths: rawLearningPaths, 
        userProgress: filteredUserProgress,
        allUsers: rawAllUsers,
    };
}

export default async function ActivityPage() {
    const {
      currentUser: rawCurrentUser,
      projects: rawProjects,
      myTasks: rawMyTasks,
      learningPaths: rawLearningPaths,
      userProgress: rawUserProgress,
      allUsers: rawAllUsers
    } = await getActivityPageData();
  
    if (!rawCurrentUser) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p>Loading activity...</p>
        </div>
      );
    }
  
    const currentUser = {
      ...rawCurrentUser,
      createdAt: serializeTimestamp(rawCurrentUser.createdAt),
      lastLogin: serializeTimestamp(rawCurrentUser.lastLogin),
    };
  
    const allUsers = rawAllUsers.map(u => ({
      ...u,
      createdAt: serializeTimestamp(u.createdAt),
      lastLogin: serializeTimestamp(u.lastLogin),
    }));
  
    const projects = rawProjects.map(p => {
      const teamWithUsers = (p.team || []).reduce<Array<ProjectMember & { user: User }>>((acc, member) => {
        const user = allUsers.find(u => u.id === member.userId);
        if (user) {
          acc.push({ ...member, user });
        }
        return acc;
      }, []);
  
      return {
        ...p,
        createdAt: serializeTimestamp(p.createdAt),
        updatedAt: serializeTimestamp(p.updatedAt),
        startDate: p.startDate ? serializeTimestamp(p.startDate) : undefined,
        endDate: p.endDate ? serializeTimestamp(p.endDate) : undefined,
        tags: (p.tags || []).map(tag => ({
          ...tag,
          createdAt: serializeTimestamp(tag.createdAt),
          updatedAt: serializeTimestamp(tag.updatedAt),
        })),
        team: teamWithUsers,
      };
    });
  
    const myTasks = rawMyTasks.map(t => ({
      ...t,
      createdAt: serializeTimestamp(t.createdAt),
      updatedAt: serializeTimestamp(t.updatedAt),
      assignedTo: allUsers.find(u => u.id === t.assignedToId) ?? undefined,
    }));
  
    const learningPaths = rawLearningPaths.map(lp => ({
      ...lp,
      createdAt: serializeTimestamp(lp.createdAt),
      updatedAt: serializeTimestamp(lp.updatedAt),
      Icon: iconMap[lp.category as keyof typeof iconMap] || FlaskConical,
    }));
  
    const userProgress = rawUserProgress;
  
    const completedModulesData: CompletedModuleData[] = (userProgress || []).flatMap(progress =>
      (progress.completedModules || []).map(moduleId => {
        const path = learningPaths.find(p => p.pathId === progress.pathId);
        // Renamed 'module' to 'learningModule' to avoid reserved keyword conflict
        const learningModule = path?.modules.find(m => m.moduleId === moduleId);
  
        const serializablePath = path ? { pathId: path.pathId, title: path.title } : undefined;
  
        return serializablePath && learningModule ? { path: serializablePath, module: learningModule } : null;
      })
    ).filter((item): item is CompletedModuleData => !!item);
  
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Activity</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <ActivityClientPage
            currentUser={currentUser} // Pass currentUser as a prop
            myTasks={myTasks}
            completedModulesData={completedModulesData}
            projects={projects}
            updateTask={updateTaskAction}
            deleteTask={deleteTaskAction}
          />
        </div>
      </div>
    );
  }
