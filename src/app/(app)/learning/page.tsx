
import { getAllLearningPaths, getAllUserLearningProgress, getAllProjects, getAllProjectPathLinks } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import LearningClientPage from "./learning-client-page";
import { redirect } from 'next/navigation';
import { Timestamp } from "firebase-admin/firestore";

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
        currentUser: serializeTimestamps(currentUser), 
        learningPaths: serializeTimestamps(learningPaths), 
        userProgress: serializeTimestamps(userProgress),
        projects: serializeTimestamps(projects),
        allProjectPathLinks: serializeTimestamps(allProjectPathLinks),
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
            learningPaths={learningPaths as any}
            userProgress={userProgress as any}
            projects={projects as any}
            allProjectPathLinks={allProjectPathLinks as any}
        />
    </div>
  );
}
