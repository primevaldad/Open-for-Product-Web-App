
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type { User, LearningPath, ProjectPathLink } from '@/lib/types';

// Define a specific props type for the page
type PageProps = {
  params: { id: string };
};

// Helper to serialize Firestore Timestamps
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

// --- Data Fetching ---
async function getUserProfilePageData(userId: string) {
    const currentUser = await getAuthenticatedUser();
    const user = await findUserById(userId);

    if (!user) {
        return { user: null, userProjects: [], currentUser: serializeTimestamps(currentUser), allLearningPaths: [], allProjectPathLinks: [] };
    }

    const [allProjects, allLearningPaths, allProjectPathLinks] = await Promise.all([
        getAllProjects(),
        getAllLearningPaths(),
        getAllProjectPathLinks()
    ]);

    const userProjects = allProjects.filter(p => p.team.some(m => m.userId === userId));
    
    // Ensure all data passed to the client is serializable
    const serializableUser = serializeTimestamps(user);
    const serializableProjects = serializeTimestamps(userProjects);
    const serializableCurrentUser = serializeTimestamps(currentUser);
    const serializableLearningPaths = serializeTimestamps(allLearningPaths);
    const serializableProjectPathLinks = serializeTimestamps(allProjectPathLinks);

    // Add fallbacks for potentially null fields
    if (!serializableUser.bio) serializableUser.bio = '';
    if (!serializableUser.location) serializableUser.location = '';

    return { 
        user: serializableUser, 
        userProjects: serializableProjects, 
        currentUser: serializableCurrentUser, 
        allLearningPaths: serializableLearningPaths,
        allProjectPathLinks: serializableProjectPathLinks
    };
}

// --- Server Component: UserProfilePage ---
export default async function UserProfilePage({ params }: PageProps) {
  const { user, userProjects, currentUser, allLearningPaths, allProjectPathLinks } = await getUserProfilePageData(params.id);

  if (!user || !currentUser) {
    notFound();
  }

  const isCurrentUserProfile = currentUser.id === user.id;

  return (
    <UserProfilePageClient
        user={user as User} // Cast to User type for the client component
        userProjects={userProjects}
        isCurrentUserProfile={isCurrentUserProfile}
        allLearningPaths={allLearningPaths as LearningPath[]}
        allProjectPathLinks={allProjectPathLinks as ProjectPathLink[]}
    />
  );
}
