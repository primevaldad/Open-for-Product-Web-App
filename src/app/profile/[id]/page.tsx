
import { notFound } from 'next/navigation';
import { getHydratedData } from '@/lib/data-cache';
import type { User, Project } from '@/lib/types';
import UserProfilePageClient from './profile-client-page';

// This is now a Server Component that fetches all necessary data
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const { users, projects, currentUser } = await getHydratedData();
  
  const userId = params.id;
  const user = users.find(u => u.id === userId);

  if (!user) {
    notFound();
  }
  
  const isCurrentUserProfile = currentUser.id === user.id;

  const userProjects = projects.filter(
    p => p.status === 'published' && p.team.some(member => member.user.id === user.id)
  );

  return (
    <UserProfilePageClient 
        user={user} 
        userProjects={userProjects} 
        isCurrentUserProfile={isCurrentUserProfile} 
    />
  );
}
