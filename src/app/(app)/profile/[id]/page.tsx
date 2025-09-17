
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllProjects, findUserById } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';

// --- Data Fetching ---
async function getUserProfilePageData(userId: string) {
    const currentUser = await getAuthenticatedUser();
    const user = await findUserById(userId);

    if (!user) {
        return { user: null, userProjects: [], currentUser };
    }

    const allProjects = await getAllProjects();
    const userProjects = allProjects.filter(p => p.team.some(m => m.userId === userId));
        
    return { user, userProjects, currentUser };
}

// --- Server Component: UserProfilePage ---
export default async function UserProfilePage({ params }: { params: { id: string } }) {
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
