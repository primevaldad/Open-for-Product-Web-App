
import { getAllLearningPaths, getAllUserLearningProgress, getAllProjects, getAllProjectPathLinks } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import LearningClientPage from "./learning-client-page";
import { redirect } from 'next/navigation';
import { Timestamp } from "firebase-admin/firestore";
import { Project, User, LearningPath, UserLearningProgress, ProjectPathLink } from "@/lib/types";

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

async function getLearningPageData() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return { currentUser: null, learningPaths: [], userProgress: [], projects: [], allProjectPathLinks: [] };
    }
    const [learningPaths, allUserProgress, projects, allProjectPathLinks] = await Promise.all([
        getAllLearningPaths(),
        getAllUserLearningProgress(),
        getAllProjects(),
        getAllProjectPathLinks(),
    ]);
    const userProgress = allUserProgress.filter(up => up.userId === currentUser.id);

    return { 
 currentUser: serializeTimestamps(currentUser) as User,
 // The data fetching functions should return the correct types directly.
 // Assuming getAllLearningPaths returns LearningPath[], getAllUserLearningProgress returns UserLearningProgress[], etc.
 // If serializeTimestamps is needed to handle nested Timestamps, its return type or the data structure should be adjusted.
 // For now, removing the redundant casts and relying on the type returned by the data fetching functions.
 // If serialization is strictly necessary and changes the structure, the types should reflect that.
 // A more robust solution would involve a dedicated serialization function that returns a type derived from the original type.
 learningPaths: learningPaths as LearningPath[],
 userProgress: userProgress as UserLearningProgress[],
 projects: projects as Project[],
 allProjectPathLinks: allProjectPathLinks as ProjectPathLink[],
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
