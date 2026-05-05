import { getAuthenticatedUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';
import { 
    getGlobalActivityFeed, 
    getAllUsers, 
    getAllProjects, 
    getFeedPosts, 
    getDiscussionsByProjects 
} from '@/lib/data.server';
import { FeedClientPage } from './feed-client-page';
import { deepSerialize } from '@/lib/utils.server';
import type { User, Project, Activity, Post, Discussion } from '@/lib/types';

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

    const usersMap = new Map(allUsers.map(u => [u.id, u]));
    const projectsMap = new Map(allProjects.map(p => [p.id, p]));

    // 2. Identify relevant projects
    const memberProjectIds = allProjects
        .filter(p => p.team.some(m => m.userId === currentUser.id) || p.ownerId === currentUser.id)
        .map(p => p.id);
    
    const followedProjectIds = currentUser.followedProjectIds || [];

    // 3. Fetch Posts, Discussions, and Notifications in parallel
    const [
        memberPosts,
        followedPosts,
        memberDiscussions,
        followedDiscussions,
        rawActivity
    ] = await Promise.all([
        getFeedPosts(memberProjectIds),
        getFeedPosts(followedProjectIds),
        getDiscussionsByProjects(memberProjectIds),
        getDiscussionsByProjects(followedProjectIds),
        getGlobalActivityFeed(),
    ]);

    // 4. Hydrate Activity (existing logic)
    const hydratedActivity = rawActivity.map(item => {
        const actor = usersMap.get(item.actorId);
        const project = item.projectId ? projectsMap.get(item.projectId) : undefined;
        if (!actor) return null;
        return {
            id: item.id,
            actor,
            type: item.type,
            timestamp: item.timestamp,
            project,
            context: item.context
        };
    }).filter(Boolean);

    return (
        <FeedClientPage
            memberPosts={deepSerialize(memberPosts)}
            followedPosts={deepSerialize(followedPosts)}
            memberDiscussions={deepSerialize(memberDiscussions)}
            followedDiscussions={deepSerialize(followedDiscussions)}
            notifications={deepSerialize(hydratedActivity)}
            users={deepSerialize(allUsers)}
            projects={deepSerialize(allProjects)}
            currentUser={deepSerialize(currentUser)}
        />
    );
}
