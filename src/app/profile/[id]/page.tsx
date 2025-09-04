
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getCurrentUser, hydrateProjectTeam, findUserById, getAllProjects } from '@/lib/data-cache';

async function getUserProfilePageData(userId: string) {
    const currentUser = await getCurrentUser();
    const user = await findUserById(userId);

    if (!user) return { user: null, userProjects: [], currentUser };

    const allProjects = await getAllProjects();
    const userProjectPromises = allProjects
        .filter(p => p.team.some(m => m.userId === userId))
        .map(p => hydrateProjectTeam(p));
        
    const userProjects = await Promise.all(userProjectPromises);

    return { user, userProjects, currentUser };
}


// This is now a Server Component that fetches all necessary data
export default async function UserProfilePage({ params }: { params: { id:string } }) {

  const { user, userProjects, currentUser } = await getUserProfilePageData(params.id);

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
