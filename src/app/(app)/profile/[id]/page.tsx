import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type { User, LearningPath, Project, ProjectPathLink } from '@/lib/types';

// Props type for Next.js page
interface PageProps {
  params: { id: string };
}

// Helper to serialize Firestore Timestamps to ISO strings
function serializeTimestamps<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;

  if ('toDate' in data && typeof (data as any).toDate === 'function') {
    return (data as any).toDate().toISOString() as any;
  }

  if (Array.isArray(data)) return data.map(serializeTimestamps) as any;

  const result: any = {};
  for (const key in data) {
    result[key] = serializeTimestamps((data as any)[key]);
  }
  return result;
}

// Fetch all data needed for user profile page
async function getUserProfilePageData(userId: string) {
  const currentUser = await getAuthenticatedUser();
  const user = await findUserById(userId);

  if (!user) {
    return {
      user: null,
      userProjects: [],
      currentUser: serializeTimestamps(currentUser),
      allLearningPaths: [],
      allProjectPathLinks: [],
    };
  }

  const [allProjects, allLearningPaths, allProjectPathLinks] = await Promise.all([
    getAllProjects(),
    getAllLearningPaths(),
    getAllProjectPathLinks(),
  ]);

  const userProjects = allProjects.filter(p => p.team.some(m => m.userId === userId));

  // Serialize all timestamps
  return {
    user: { ...serializeTimestamps(user), bio: user.bio || '', location: user.location || '' } as User,
    userProjects: serializeTimestamps(userProjects) as Project[],
    currentUser: serializeTimestamps(currentUser) as User,
    allLearningPaths: serializeTimestamps(allLearningPaths) as LearningPath[],
    allProjectPathLinks: serializeTimestamps(allProjectPathLinks) as ProjectPathLink[],
  };
}

// Server component for the profile page
export default async function UserProfilePage({ params }: PageProps) {
  const { id: userId } = params;

  const { user, userProjects, currentUser, allLearningPaths, allProjectPathLinks } =
    await getUserProfilePageData(userId);

  if (!user || !currentUser) {
    notFound();
  }

  const isCurrentUserProfile = currentUser.id === user.id;

  return (
    <UserProfilePageClient
      user={user}
      userProjects={userProjects}
      isCurrentUserProfile={isCurrentUserProfile}
      allLearningPaths={allLearningPaths}
      allProjectPathLinks={allProjectPathLinks}
    />
  );
}
