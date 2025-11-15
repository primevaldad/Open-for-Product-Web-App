'use server';

import { getSteemAccount } from '@/lib/steem.server';

/**
 * Server Action to get a Steem account by username.
 * This is the public-facing API for our client components.
 * It now returns a structured response with either data or an error.
 */
export async function getSteemUserAction(username: string) {
    return getSteemAccount(username);
}
