
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type { User, LearningPath, Project, ProjectPathLink } from '@/lib/types';
import type { RoutePageProps } from '@/types/next-page-helpers';
import { serializeTimestamp } from '@/lib/utils'; // Import the centralized helper

// Generic recursive serializer using the centralized helper
function serializeData<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;

  // Handle Firestore Timestamps or Date objects
  if ('toDate' in data && typeof (data as any).toDate === 'function' || data instanceof Date) {
    return serializeTimestamp(data) as any;
  }

  if (Array.isArray(data)) return data.map(serializeData) as any;

  const result: any = {};
  for (const key in data) {
    result[key] = serializeData((data as any)[key]);
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
      currentUser: serializeData(currentUser),
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

  // Serialize all data before returning
  return {
    user: { ...serializeData(user), bio: user.bio || '', location: user.location || '' } as User,
    userProjects: serializeData(userProjects) as Project[],
    currentUser: serializeData(currentUser) as User,
    allLearningPaths: serializeData(allLearningPaths) as LearningPath[],
    allProjectPathLinks: serializeData(allProjectPathLinks) as ProjectPathLink[],
  };
}

// Server component for the profile page, using the new RoutePageProps type
export default async function UserProfilePage({ params }: RoutePageProps<{ id: string }>) {
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
