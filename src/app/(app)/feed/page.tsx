import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feeds | Open for Product',
};

import { getAuthenticatedUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';
import { 
    getAllUsers, 
    getAllProjects, 
    getFeedPosts, 
    getDiscussionsByProjects,
    getRecentPublishedPosts,
    getRecentDiscussions
} from '@/lib/data.server';
import { getHydratedNotifications } from '@/app/actions/notifications';
import { FeedClientPage } from './feed-client-page';
import { deepSerialize } from '@/lib/utils.server';

export default async function FeedPage() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
        redirect('/login');
    }

    // 1. Get all projects to find memberships and follows
    const [allUsers, allProjects] = await Promise.all([
        getAllUsers(),
        getAllProjects(currentUser),
    ]);

    // 2. Identify relevant projects
    const memberProjectIds = allProjects
        .filter(p => p.team.some(m => m.userId === currentUser.id) || p.owner?.id === currentUser.id)
        .map(p => p.id);
    
    // We can fetch followed project posts in the same "Project Posts" tab
    const followedProjectIds = currentUser.followedProjectIds || [];
    const myProjectIds = [...new Set([...memberProjectIds, ...followedProjectIds])];

    // 3. Fetch Posts, Discussions, and Notifications in parallel
    const [
        memberPosts,
        memberDiscussions,
        globalPosts,
        globalDiscussions,
        notificationsResponse
    ] = await Promise.all([
        getFeedPosts(myProjectIds),
        getDiscussionsByProjects(myProjectIds),
        getRecentPublishedPosts(50),
        getRecentDiscussions(50),
        getHydratedNotifications(),
    ]);

    return (
        <FeedClientPage
            memberPosts={deepSerialize(memberPosts)}
            globalPosts={deepSerialize(globalPosts)}
            memberDiscussions={deepSerialize(memberDiscussions)}
            globalDiscussions={deepSerialize(globalDiscussions)}
            notifications={deepSerialize(notificationsResponse.notifications || [])}
            users={deepSerialize(allUsers)}
            projects={deepSerialize(allProjects)}
            currentUser={deepSerialize(currentUser)}
        />
    );
}
