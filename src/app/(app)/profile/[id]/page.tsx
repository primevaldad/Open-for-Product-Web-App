
import { getProjectsByUserId, getAllLearningPaths, getAllProjectPathLinks, findUserById } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { notFound } from 'next/navigation';
import UserProfilePageClient from './profile-client-page';
import { deepSerialize } from '@/lib/utils.server';

// This is a server component
async function getUserProfileData(userId: string) {
    const [user, userProjects, allLearningPathsResult, allProjectPathLinks, currentUser] = await Promise.all([
        findUserById(userId),
        getProjectsByUserId(userId),
        getAllLearningPaths(),
        getAllProjectPathLinks(),
        getAuthenticatedUser(),
    ]);

    if (!user) {
        return null;
    }

    return deepSerialize({
        user,
        userProjects,
        isCurrentUserProfile: user.id === currentUser?.id,
        allLearningPaths: allLearningPathsResult.paths,
        allProjectPathLinks,
        currentUser,
    });
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
    const props = await getUserProfileData(params.id);

    if (!props) {
        notFound();
    }

    return <UserProfilePageClient {...props} />;
}
