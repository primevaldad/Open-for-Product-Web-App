
import { getProjectsByUserId, getAuthenticatedUser } from '@/lib/data.server';
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { getAllLearningPaths, getAllProjectPathLinks, findUserById } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils';

// This is a server component
async function getUserProfileData(userId: string) {
    const [user, userProjects, allLearningPaths, allProjectPathLinks, currentUser] = await Promise.all([
        findUserById(userId),
        getProjectsByUserId(userId),
        getAllLearningPaths(),
        getAllProjectPathLinks(),
        getAuthenticatedUser(),
    ]);

    if (!user) {
        return { notFound: true };
    }

    return deepSerialize({
        user,
        userProjects,
        isCurrentUserProfile: user.id === currentUser?.id,
        allLearningPaths,
        allProjectPathLinks,
        currentUser,
    });
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
    const { notFound: isNotFound, ...props } = await getUserProfileData(params.id);

    if (isNotFound) {
        notFound();
    }

    // @ts-ignore
    return <UserProfilePageClient {...props} />;
}
