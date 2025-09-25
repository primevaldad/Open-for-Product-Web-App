
import { getAllLearningPaths, getAllUserLearningProgress, getAllProjects, getAllProjectPathLinks } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import LearningClientPage from "./learning-client-page";
import { redirect } from 'next/navigation';

<<<<<<< HEAD
// Helper to serialize Firestore Timestamps
=======
>>>>>>> display
function serializeTimestamps(data: any): any {
    if (data === null || typeof data !== 'object') {
        return data;
    }
    if ('toDate' in data && typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeTimestamps);
    }
    const serialized: { [key: string]: any } = {};
    for (const key in data) {
        serialized[key] = serializeTimestamps(data[key]);
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
<<<<<<< HEAD
      <LearningClientPage
          learningPaths={learningPaths}
          userProgress={userProgress}
          projects={projects}
          allProjectPathLinks={allProjectPathLinks}
      />
=======
    <div className="space-y-6">
        <h1 className="text-2xl font-bold">Learning Paths</h1>
        <LearningClientPage
            learningPaths={learningPaths}
            userProgress={userProgress}
            projects={projects}
            allProjectPathLinks={allProjectPathLinks}
        />
    </div>
>>>>>>> display
  );
}
