import { getUser, getUserByUsername, getProjectsForUser } from '@/lib/data.server';
import { notFound } from 'next/navigation';
import ProfileClientPage from '../profile/[id]/profile-client-page';
import { User } from '@/lib/types';

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const user = (await getUserByUsername(params.username)) as User;

  if (!user) {
    notFound();
  }

  const projects = await getProjectsForUser(user.id);

  return <ProfileClientPage user={user} projects={projects} />;
}
