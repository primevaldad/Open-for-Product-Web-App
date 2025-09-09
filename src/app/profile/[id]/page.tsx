
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById } from '@/lib/data.server'; // Corrected import
import { getAuthenticatedUser } from '@/lib/session.server'; // Corrected import

async function getUserProfilePageData(userId: string) {
    const currentUser = await getAuthenticatedUser(); // Corrected function call
    const user = await findUserById(userId);

    if (!user) return { user: null, userProjects: [], currentUser };

    const allProjects = await getAllProjects();
    const userProjects = allProjects
        .filter(p => p.team.some(m => m.userId === userId));
        
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
