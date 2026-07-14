'use server';

import { getAuthenticatedUser } from "@/lib/session.server";
import { getGlobalActivityFeed, getAllProjects, getAllUsers, getAllPublicCollections, findCollectionsByOwner } from "@/lib/data.server";
import { hydrateActivityItem, HydratedActivityItem } from "@/app/(app)/activity/utils";
import { deepSerialize } from "@/lib/utils.server";
import { getRankedPosts } from "@/lib/steem.server";
import { ActivityType } from "@/lib/types";

export async function getActivityPageData() {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) {
            return deepSerialize({ 
                success: false, 
                error: "User not authenticated."
            });
        }

        const [activity, projects, users, steemResult, publicCollections, ownedCollections] = await Promise.all([
            getGlobalActivityFeed(),
            getAllProjects(currentUser),
            getAllUsers(),
            getRankedPosts('created', 'hive-111745', 10),
            getAllPublicCollections(),
            findCollectionsByOwner(currentUser.id)
        ]);

        const projectsMap = new Map(projects.map(p => [p.id, p]));
        const usersMap = new Map(users.map(u => [u.id, u]));
        const steemUsersMap = new Map(users.filter(u => u.steemUsername).map(u => [u.steemUsername!.toLowerCase(), u]));

        // Create map of accessible collections (public + owned)
        const accessibleCollectionsMap = new Map();
        publicCollections.forEach(c => accessibleCollectionsMap.set(c.id, c));
        ownedCollections.forEach(c => accessibleCollectionsMap.set(c.id, c));

        // 1. Hydrate internal activity
        const hydratedActivity = activity
            .map(item => hydrateActivityItem(item, usersMap, projectsMap, accessibleCollectionsMap))
            .filter((item): item is HydratedActivityItem => !!item);

        // 2. Map Steem posts to activity items
        const steemActivity: HydratedActivityItem[] = (steemResult.posts || []).map(post => {
            const steemAuthor = post.author.toLowerCase();
            const linkedUser = steemUsersMap.get(steemAuthor);
            
            // Create a "virtual" actor if no linked user exists
            const actor = linkedUser || {
                id: `steem-${post.author}`,
                name: post.author,
                username: post.author,
                avatarUrl: `https://steemitimages.com/u/${post.author}/avatar`,
                steemUsername: post.author,
            } as any;

            return {
                id: `steem-${post.post_id}`,
                actor,
                type: ActivityType.SteemCommunityPost,
                timestamp: post.created,
                context: {
                    steemTitle: post.title,
                    steemUrl: post.url,
                    steemCommunity: post.community_title || 'Open for Product',
                }
            };
        });

        // 3. Merge and sort
        const combinedActivity = [...hydratedActivity, ...steemActivity]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 30); // Show top 30 combined

        return deepSerialize({
            success: true,
            currentUser,
            activity: combinedActivity,
            projects,
            users,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return deepSerialize({ success: false, error: message });
    }
}
