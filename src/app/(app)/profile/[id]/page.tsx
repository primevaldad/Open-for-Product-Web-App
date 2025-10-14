
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
// import type { User, LearningPath, Project, ProjectPathLink } from '@/lib/types';
import type { RoutePageProps } from '@/types/next-page-helpers';
import { Timestamp } from 'firebase-admin/firestore';

// Helper to serialize Firestore Timestamps to ISO strings
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
    user: { ...serializeTimestamps(user) as object, bio: user.bio || '', location: user.location || '' } as any,
    userProjects: serializeTimestamps(userProjects) as any,
    currentUser: serializeTimestamps(currentUser) as any,
    allLearningPaths: serializeTimestamps(allLearningPaths) as any,
    allProjectPathLinks: serializeTimestamps(allProjectPathLinks) as any,
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
