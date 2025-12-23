
'use server';

import { getSteemAccount, syncAndGetSteemPosts } from '@/lib/steem.server';
import { getAuthenticatedUser as getCurrentUser } from '@/lib/session.server';

/**
 * Server Action to get a Steem account by username.
 */
export async function getSteemUserAction(username: string) {
    return getSteemAccount(username);
}

/**
 * Server Action to sync and get a Steem user's blog posts from the cache.
 * This is the primary action that should be used by the UI.
 */
export async function syncSteemPostsAction(username: string) {
    // We need the user's ID to manage their cache, so we get the current session.
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return { posts: null, error: 'You must be logged in to sync Steem posts.' };
    }

    return syncAndGetSteemPosts(currentUser.id, username);
}
