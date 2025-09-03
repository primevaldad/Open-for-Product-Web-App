
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getCurrentUser, hydrateProjectTeam, findUserById, getAllProjects } from '@/lib/data-cache';

function getUserProfilePageData(userId: string) {
    const currentUser = getCurrentUser();
    const user = findUserById(userId);

    if (!user) return { user: null, userProjects: [], currentUser };

    const userProjects = getAllProjects()
        .filter(p => p.team.some(m => m.userId === userId))
        .map(p => hydrateProjectTeam(p));

    return { user, userProjects, currentUser };
}


// This is now a Server Component that fetches all necessary data
export default function UserProfilePage({ params }: { params: { id:string } }) {

  const { user, userProjects, currentUser } = getUserProfilePageData(params.id);

  if (!user || !currentUser) {
    notFound();
  }

  const isCurrentUserProfile = currentUser.id === user.id;

  return (
    <UserProfilePageClient
        user={user}
        userProjects={userProjects}
        isCurrentUserProfile={isCurrentUserProfile}
    />
  );
}
