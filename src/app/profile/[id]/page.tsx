
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Project, ProjectMember, Discussion } from '@/lib/types';
import { getCurrentUser, hydrateProjectTeam } from '@/lib/data-cache';


async function getUserProfilePageData(userId: string) {
    const currentUser = await getCurrentUser();
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const user = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;

    if (!user) return { user: null, userProjects: [], currentUser };
    
    const allUsersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
    
    const projectsQuery = query(
      collection(db, 'projects'), 
      where('team', 'array-contains', { role: 'participant', userId: userId })
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    
    const rawProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const userProjects = await Promise.all(
        rawProjects.map(p => hydrateProjectTeam(p as Project, allUsers))
    );

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
