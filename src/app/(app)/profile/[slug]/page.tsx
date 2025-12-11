import { findUserByUsername, findUserById, getProjectsByUserId, getAllLearningPaths, getAllProjectPathLinks } from '@/lib/data.server';
import { notFound } from 'next/navigation';
import ProfileClientPage from './profile-client-page';
import { getAuthenticatedUser } from '@/lib/session.server';

export default async function UserProfilePage({ params }: { params: { slug: string } }) {
  let user = await findUserByUsername(params.slug);

  if (!user) {
    user = await findUserById(params.slug);
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
      user={user}
      userProjects={userProjects}
      isCurrentUserProfile={currentUser?.id === user.id}
      allLearningPaths={allLearningPathsResult.paths}
      allProjectPathLinks={allProjectPathLinks}
      currentUser={currentUser}
    />
  );
}
