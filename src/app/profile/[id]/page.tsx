
import { notFound } from 'next/navigation';
import { getHydratedData } from '@/lib/data-cache';
import UserProfilePageClient from './profile-client-page';
import { db } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';


// This is now a Server Component that fetches all necessary data
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  
  const { projects, currentUser } = await getHydratedData();
  const userId = params.id;

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    notFound();
  }
  const user = { id: userDoc.id, ...userDoc.data() } as User;
  
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
