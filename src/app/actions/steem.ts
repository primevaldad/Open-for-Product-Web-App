'use server';

import { getSteemAccount, getSteemUserPosts } from '@/lib/steem.server';

/**
 * Server Action to get a Steem account by username.
 */
export async function getSteemUserAction(username: string) {
    return getSteemAccount(username);
}

/**
 * Server Action to get a Steem user's blog posts.
 */
export async function getSteemUserPostsAction(username: string) {
    return getSteemUserPosts(username);
}
