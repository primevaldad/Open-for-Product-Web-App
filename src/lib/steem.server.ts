'use server';

import type { SteemAccount, SteemPost, UserId } from '@/lib/types';
import { getLatestCachedPost, getCachedPosts, saveSteemPosts } from '@/lib/firebase.server';

const STEEM_API_URL = 'https://api.steemit.com';

/**
 * NOTE: We are intentionally using a direct `fetch` call instead of a library
 * like `dsteem`. Early attempts showed that `dsteem` has compatibility issues
 * with the Next.js server action environment, causing requests to hang indefinitely.
 * This direct approach is more robust and includes a manual timeout.
 * If more complex Steem functionality is needed, `dhive` should be evaluated.
 */

// This interface represents the raw account object from the Steem API.
interface RawSteemAccount {
    name: string;
    post_count: number;
    json_metadata: string;
    reputation: string | number; // Reputation can be a string or number
    voting_power: number;
    balance: string;
}

/**
 * Maps a RawSteemAccount object to our app-specific SteemAccount interface.
 */
function toSteemAccount(account: RawSteemAccount): SteemAccount {
    return {
        name: account.name,
        post_count: account.post_count,
        json_metadata: account.json_metadata,
        reputation: String(account.reputation), // Ensure reputation is a string
        voting_power: account.voting_power,
        balance: account.balance,
    };
}

/**
 * Fetches a Steem account using a direct fetch call to the JSON-RPC API.
 */
export async function getSteemAccount(username: string): Promise<{ account: SteemAccount | null; error: string | null; }> {
    if (!username) {
        return { account: null, error: 'No username provided.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
        const response = await fetch(STEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_accounts',
                params: [[username]],
                id: 1,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Steem API returned an HTTP error: ${response.status}`);
        }

        const json = await response.json();
        
        if (json.error) {
            throw new Error(json.error.message || 'Steem API returned an unspecified error');
        }

        const accounts = json.result;

        if (accounts && accounts.length > 0 && accounts[0]) {
            return { account: toSteemAccount(accounts[0]), error: null };
        }
        
        return { account: null, error: 'Steem user not found.' };

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { account: null, error: 'Request to Steem API timed out after 10 seconds.' };
        }
        console.error(`Critical error in getSteemAccount for ${username}:`, error);
        return { account: null, error: error.message || 'An unknown server error occurred.' };
    }
}

/**
 * Fetches the latest blog posts for a Steem user directly from the API.
 */
export async function getSteemUserPosts(username: string, limit: number = 10): Promise<{ posts: SteemPost[] | null; error: string | null; }> {
    // ... (implementation remains the same as before)
    if (!username) {
        return { posts: null, error: 'No username provided.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(STEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_discussions_by_blog',
                params: [{ tag: username, limit: limit }],
                id: 1,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Steem API returned an HTTP error: ${response.status}`);
        }

        const json = await response.json();

        if (json.error) {
            throw new Error(json.error.message || 'Steem API returned an unspecified error for posts');
        }

        return { posts: json.result || [], error: null };

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { posts: null, error: 'Request to Steem API for posts timed out.' };
        }
        console.error(`Critical error in getSteemUserPosts for ${username}:`, error);
        return { posts: null, error: error.message || 'An unknown server error occurred.' };
    }
}

/**
 * Orchestrates fetching, caching, and retrieving Steem posts.
 */
export async function syncAndGetSteemPosts(userId: UserId, steemUsername: string): Promise<{ posts: SteemPost[] | null; error: string | null; }> {
    const latestCachedTimestamp = await getLatestCachedPost(userId);
    const { posts: latestSteemPosts, error: apiError } = await getSteemUserPosts(steemUsername, 10);

    if (apiError) {
        // If the API fails, return the cached data as a fallback.
        console.warn(`Steem API failed. Falling back to cached posts for user ${userId}. Error: ${apiError}`);
        const cachedPosts = await getCachedPosts(userId);
        return { posts: cachedPosts, error: `Live data unavailable. Displaying cached posts. API Error: ${apiError}` };
    }

    if (!latestSteemPosts) {
        return { posts: await getCachedPosts(userId), error: null };
    }

    let postsToSave: SteemPost[];

    if (latestCachedTimestamp) {
        // Filter for posts that are newer than our latest cache.
        postsToSave = latestSteemPosts.filter(post => new Date(post.created) > new Date(latestCachedTimestamp));
    } else {
        // If no cache exists, all fetched posts are new.
        postsToSave = latestSteemPosts;
    }

    if (postsToSave.length > 0) {
        // We don't need to wait for this to complete.
        saveSteemPosts(userId, postsToSave);
    }

    // Return the full, up-to-date list from our cache.
    const finalPosts = await getCachedPosts(userId);
    return { posts: finalPosts, error: null };
}
