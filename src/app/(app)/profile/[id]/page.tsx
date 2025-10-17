
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import type { User, LearningPath, Project, ProjectPathLink } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';


// Helper to serialize Firestore Timestamps to ISO strings
type Serializable = string | number | boolean | null | { [key: string]: Serializable } | Serializable[];

// function serializeTimestamps(data: unknown): Serializable {
//     if (data === null || typeof data !== 'object') {
//         return data as Serializable;
//     }
//     if (data instanceof Timestamp) {
//         return data.toDate().toISOString();
//     }
//     if (Array.isArray(data)) {
//         return data.map(serializeTimestamps);
//     }
//     const serialized: { [key: string]: Serializable } = {};
//     for (const key in data) {
//         if (Object.prototype.hasOwnProperty.call(data, key)) {
//             serialized[key] = serializeTimestamps((data as { [key: string]: unknown })[key]);
//         }
//     }
//     return serialized;
// }

function deepSerialize<T>(obj: T): T {
 if (obj === null || typeof obj !== 'object') {
 return obj;
 }

 if (obj instanceof Timestamp) {
 return obj.toDate().toISOString() as T;
 }

 if (Array.isArray(obj)) {
 return obj.map(deepSerialize) as T;
 }

 const serializedObj: { [key: string]: unknown } = {};
 for (const key in obj) {
 if (Object.prototype.hasOwnProperty.call(obj, key)) {
 serializedObj[key] = deepSerialize((obj as Record<string, unknown>)[key]);
 }
 }
 return serializedObj as T;
}

// Fetch all data needed for user profile page
async function getUserProfilePageData(userId: string) {
  const currentUser = await getAuthenticatedUser();
  const user: User | null = await findUserById(userId);

  if (!user) {
 return {
 user: null,
      userProjects: [] as Project[],
 currentUser: currentUser ? deepSerialize(currentUser) : null,
 allLearningPaths: [] as LearningPath[],
 allProjectPathLinks: [] as ProjectPathLink[],
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
 user: deepSerialize(user),
 userProjects: deepSerialize(userProjects),
 currentUser: currentUser ? deepSerialize(currentUser) : null,
 allLearningPaths: deepSerialize(allLearningPaths),
 allProjectPathLinks: deepSerialize(allProjectPathLinks),
  };
}

// Server component for the profile page
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const { id: userId } = params;

  const { user, userProjects, currentUser, allLearningPaths, allProjectPathLinks }: { user: User | null; userProjects: Project[]; currentUser: any; allLearningPaths: LearningPath[]; allProjectPathLinks: ProjectPathLink[] } =
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
