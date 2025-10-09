
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
import type { Project, Task, Discussion, User, LearningPath } from "@/lib/types";
import type { RoutePageProps } from "@/types/next-page-helpers";
import { serializeTimestamp } from "@/lib/utils"; // Import the centralized helper

// Generic recursive serializer using the centralized helper
function serializeData<T>(data: T): T {
  if (data === null || typeof data !== "object") return data;

  if ('toDate' in data && typeof (data as unknown).toDate === 'function' || data instanceof Date) {
    return serializeTimestamp(data) as unknown;
  }

  if (Array.isArray(data)) return data.map(serializeData) as unknown;

  const result: unknown = {};
  for (const key in data) {
    result[key] = serializeData((data as unknown)[key]);
  }
  return result;
}

export default async function ProjectDetailPage({ params }: RoutePageProps<{ id: string }>): Promise<JSX.Element> {
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
  const serializedCurrentUser = serializeData(currentUser);
  const allUsers = allUsersRaw.map(u => serializeData(u)) as User[];
  const tasks = tasksRaw.map(t => serializeData(t)) as Task[];
  const discussions = discussionsRaw.map(d => serializeData(d)) as Discussion[];
  const project = serializeData(projectData) as Project;
  const recommendedLearningPaths = recommendedLearningPathsRaw.map(lp => serializeData(lp)) as LearningPath[];

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

  const hydratedProject = { ...project, team: hydratedTeam } as Project;

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
