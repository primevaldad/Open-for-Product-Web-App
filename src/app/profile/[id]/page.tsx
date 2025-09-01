
import { notFound } from 'next/navigation';
import { getUserProfilePageData } from '@/lib/data-cache';
import UserProfilePageClient from './profile-client-page';
import { db } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';


// This is now a Server Component that fetches all necessary data
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  
  const { user, userProjects, currentUser } = await getUserProfilePageData(params.id);
  
  if (!user) {
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
