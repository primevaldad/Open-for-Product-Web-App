import { Metadata } from 'next';
import { findUserByUsername, findUserById, getProjectsByUserId, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { notFound } from 'next/navigation';
import ProfileClientPage from './profile-client-page';
import { getAuthenticatedUser } from '@/lib/session.server';
import { deepSerialize } from '@/lib/utils.server';
import { extractId } from '@/lib/slug';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const userId = extractId(params.slug);
  let user = await findUserById(userId);
  if (!user) user = await findUserByUsername(params.slug);

  if (!user) return { title: 'Profile Not Found | Open for Product' };
  return {
    title: `Profile - ${user.name || user.username} | Open for Product`,
    description: user.bio,
  };
}

export default async function UserProfilePage({ params }: { params: { slug: string } }) {
  const userId = extractId(params.slug);
  let user = await findUserById(userId);

  if (!user) {
    user = await findUserByUsername(params.slug);
  }

  if (!user) {
    notFound();
  }

  const [userProjects, allLearningPathsResult, allProjectPathLinks, currentUser] = await Promise.all([
    getProjectsByUserId(user.id),
    getAllLearningPaths(),
    getAllProjectPathLinks(),
    getAuthenticatedUser(),
  ]);

  return (
    <ProfileClientPage
      user={deepSerialize(user)}
      userProjects={deepSerialize(userProjects)}
      isCurrentUserProfile={currentUser?.id === user.id}
      allLearningPaths={deepSerialize(allLearningPathsResult.paths)}
      allProjectPathLinks={deepSerialize(allProjectPathLinks)}
      currentUser={deepSerialize(currentUser)}
    />
  );
}
