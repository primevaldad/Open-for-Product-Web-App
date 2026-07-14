import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feeds | Open for Product',
};

import { getAuthenticatedUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';
import { 
    getGlobalActivityFeed, 
    getAllUsers, 
    getAllProjects, 
    getFeedPosts, 
    getDiscussionsByProjects,
    getAllPublicCollections,
    findCollectionsByOwner
} from '@/lib/data.server';
import { FeedClientPage } from './feed-client-page';
import { deepSerialize } from '@/lib/utils.server';
import type { User, Project, Activity, Post, Discussion } from '@/lib/types';

export default async function FeedPage() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
        redirect('/login');
    }

    // 1. Get all projects and collections to find memberships and follows
    const [allUsers, allProjects, publicCollections, ownedCollections] = await Promise.all([
        getAllUsers(),
        getAllProjects(currentUser),
        getAllPublicCollections(),
        findCollectionsByOwner(currentUser.id)
    ]);

    const usersMap = new Map(allUsers.map(u => [u.id, u]));
    const projectsMap = new Map(allProjects.map(p => [p.id, p]));

    // Create map of accessible collections (public + owned)
    const accessibleCollectionsMap = new Map();
    publicCollections.forEach(c => accessibleCollectionsMap.set(c.id, c));
    ownedCollections.forEach(c => accessibleCollectionsMap.set(c.id, c));

    // 2. Identify relevant projects
    const memberProjectIds = allProjects
        .filter(p => p.team.some(m => m.userId === currentUser.id) || p.owner?.id === currentUser.id)
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

    // 4. Hydrate Activity with security filtering
    const hydratedActivity = rawActivity.map(item => {
        const actor = usersMap.get(item.actorId);
        if (!actor) return null;

        // Security filter: if the activity is associated with a project but that project is not in projectsMap, filter it out.
        if (item.projectId && !projectsMap.has(item.projectId)) {
            return null;
        }

        // Security filter: if the activity is a collection activity, check accessibility.
        if (item.type.startsWith('collection-') && item.context?.collectionId) {
            const collId = item.context.collectionId;
            if (item.context.isProjectCollection) {
                if (!projectsMap.has(collId)) return null;
            } else {
                if (!accessibleCollectionsMap.has(collId)) return null;
            }
        }

        const project = item.projectId ? projectsMap.get(item.projectId) : undefined;
        return {
            id: item.id,
            actor,
            type: item.type,
            timestamp: item.timestamp,
            project,
            context: item.context
        };
    }).filter(Boolean) as any[];

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
