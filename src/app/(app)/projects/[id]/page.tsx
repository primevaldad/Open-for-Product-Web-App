
import { notFound } from "next/navigation";
import ProjectDetailClientPage from "./project-detail-client-page";
import { getAuthenticatedUser } from "@/lib/session.server";
import {
  findProjectById,
  findTasksByProjectId,
  getAllUsers,
  getDiscussionsByProjectId,
  getRecommendedLearningPathsForProject,
} from "@/lib/data.server";
import {
  addTask,
  addDiscussionComment,
  addTeamMember,
  deleteTask,
  joinProject,
  updateTask,
} from "@/app/actions/projects";
import type { Project, Task, Discussion, User, LearningPath, HydratedProject } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

// Recursive timestamp serialization
type Serializable = string | number | boolean | null | { [key: string]: Serializable } | Serializable[];

function serializeTimestamps(data: unknown): Serializable {
    if (data === null || typeof data !== 'object') {
        return data as Serializable;
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeTimestamps);
    }
    const serialized: { [key: string]: Serializable } = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            serialized[key] = serializeTimestamps((data as { [key: string]: unknown })[key]);
        }
    }
    return serialized;
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }): Promise<JSX.Element> {
  const { id: projectId } = params;

  // Ensure user is authenticated
  const currentUser = await getAuthenticatedUser();

  // Fetch main project data
  const projectData = await findProjectById(projectId);
  if (!projectData) notFound();

  // Fetch related data in parallel
  const [allUsersRaw, tasksRaw, discussionsRaw, recommendedLearningPathsRaw] = await Promise.all([
    getAllUsers(),
    findTasksByProjectId(projectId),
    getDiscussionsByProjectId(projectId),
    getRecommendedLearningPathsForProject(projectId),
  ]);

  // --- SERIALIZE ---
  const serializedCurrentUser = serializeTimestamps(currentUser);
  const allUsers = allUsersRaw.map(u => serializeTimestamps(u)) as User[];
  const tasks = tasksRaw.map(t => serializeTimestamps(t)) as Task[];
  const discussions = discussionsRaw.map(d => serializeTimestamps(d)) as Discussion[];
  const project = serializeTimestamps(projectData) as Project;
  const recommendedLearningPaths = recommendedLearningPathsRaw.map(lp => serializeTimestamps(lp)) as LearningPath[];

  // --- HYDRATE ---
  const hydratedTasks = tasks.map(t => ({
    ...t,
    description: t.description ?? "",
    assignedTo: t.assignedToId ? allUsers.find(u => u.id === t.assignedToId) : undefined,
  })) as Task[];

  const hydratedTeam = project.team
    .map(member => {
      const user = allUsers.find(u => u.id === member.userId);
      return user ? { ...member, user } : null;
    })
    .filter(Boolean) as (typeof project.team[0] & { user: User })[];

  const hydratedDiscussions = discussions
    .map(d => {
      const user = allUsers.find(u => u.id === d.userId);
      return user ? { ...d, user } : null;
    })
    .filter(Boolean) as (typeof discussions[0] & { user: User })[];

  const hydratedProject = { ...project, team: hydratedTeam } as HydratedProject;

  return (
    <ProjectDetailClientPage
      project={hydratedProject}
      projectTasks={hydratedTasks}
      projectDiscussions={hydratedDiscussions}
      recommendedLearningPaths={recommendedLearningPaths}
      currentUser={serializedCurrentUser as User}
      allUsers={allUsers}
      joinProject={joinProject}
      addTeamMember={addTeamMember}
      addDiscussionComment={addDiscussionComment}
      addTask={addTask}
      updateTask={updateTask}
      deleteTask={deleteTask}
    />
  );
}
