import { Metadata } from 'next';
import NewCollectionClientPage from './new-collection-client-page';
import { getAuthenticatedUser } from '@/lib/session.server';
import { getAllProjects, getProjectsByUserId } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils.server';

export const metadata: Metadata = {
  title: 'New Collection | Open for Product',
};

export default async function NewCollectionPage() {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) return null; // Should be handled by middleware

  const [allProjects, userProjects] = await Promise.all([
    getAllProjects(currentUser),
    getProjectsByUserId(currentUser.id)
  ]);

  const userLeadProjects = userProjects.filter(p => 
    p.team.some(m => m.userId === currentUser.id && m.role === 'lead')
  );

  return <NewCollectionClientPage 
    userLeadProjects={deepSerialize(userLeadProjects)} 
    allProjects={deepSerialize(allProjects)} 
  />;
}
