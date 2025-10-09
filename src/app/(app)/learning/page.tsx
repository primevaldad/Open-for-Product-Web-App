
import { getAllLearningPaths, getAllUserLearningProgress, getAllProjects, getAllProjectPathLinks } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import LearningClientPage from "./learning-client-page";
import { redirect } from 'next/navigation';
import { serializeTimestamp } from "@/lib/utils"; // Import the centralized helper
import type { LearningPath, UserLearningProgress, Project, ProjectPathLink, User } from "@/lib/types";

// Generic serializer using the centralized helper
function serializeData<T>(data: T[]): T[] {
    return data.map(item => {
        const serializedItem: unknown = { ...item };
        for (const key in serializedItem) {
            if (Object.prototype.hasOwnProperty.call(serializedItem, key)) {
                // Assuming properties like 'createdAt', 'updatedAt', 'lastLogin' are the ones with timestamps
                if (key.includes('At') || key.includes('Login')) {
                    serializedItem[key] = serializeTimestamp(serializedItem[key]);
                }
            }
        }
        return serializedItem;
    });
}


async function getLearningPageData() {
    const rawCurrentUser = await getAuthenticatedUser();
    if (!rawCurrentUser) {
      return { currentUser: null, learningPaths: [], userProgress: [], projects: [], allProjectPathLinks: [] };
    }
    const [learningPaths, allUserProgress, projects, allProjectPathLinks] = await Promise.all([
        getAllLearningPaths(),
        getAllUserLearningProgress(),
        getAllProjects(),
        getAllProjectPathLinks(),
    ]);
    const userProgress = allUserProgress.filter(up => up.userId === rawCurrentUser.id);

    // Explicitly type the serialized user object
    const currentUser: User = {
        ...rawCurrentUser,
        createdAt: serializeTimestamp(rawCurrentUser.createdAt) ?? undefined,
        lastLogin: serializeTimestamp(rawCurrentUser.lastLogin) ?? undefined,
    }

    return { 
        currentUser, 
        learningPaths: serializeData(learningPaths) as LearningPath[], 
        userProgress: serializeData(userProgress) as UserLearningProgress[],
        projects: serializeData(projects) as Project[],
        allProjectPathLinks: serializeData(allProjectPathLinks) as ProjectPathLink[],
    };
}


export default async function LearningPage() {
    const { currentUser, learningPaths, userProgress, projects, allProjectPathLinks } = await getLearningPageData();

    if (!currentUser) {
        redirect('/login');
    }

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">Learning Paths</h1>
        <LearningClientPage
            learningPaths={learningPaths}
            userProgress={userProgress}
            projects={projects}
            allProjectPathLinks={allProjectPathLinks}
        />
    </div>
  );
}
