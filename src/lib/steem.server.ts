'use server';

import type { SteemAccount, SteemPost, SteemNotification, UserId } from '@/lib/types';
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
    posting_json_metadata: string;
    json_metadata?: string;
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
        posting_json_metadata: account.posting_json_metadata || '',
        json_metadata: account.json_metadata || '',
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
 * Fetches ranked posts (trending, created, etc.) for a specific tag or community.
 * Uses the Hivemind bridge API which is more robust for community queries.
 */
export async function getRankedPosts(
    sort: 'created' | 'trending' | 'hot' = 'created',
    tag: string = 'hive-111745',
    limit: number = 10,
    observer: string = ''
): Promise<{ posts: SteemPost[] | null; error: string | null; }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(STEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'bridge.get_ranked_posts',
                params: { sort, tag, limit, observer },
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

        return { posts: json.result || [], error: null };

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { posts: null, error: 'Request to Steem API timed out.' };
        }
        console.error(`Critical error in getRankedPosts for ${tag}:`, error);
        return { posts: null, error: error.message || 'An unknown server error occurred.' };
    }
}

/**
 * Fetches the latest blog or authored posts for a Steem user.
 * @param sort 'blog' for blog (authored + reblogs) or 'posts' for direct authored posts
 */
export async function getSteemUserPosts(
    username: string, 
    sort: 'blog' | 'posts' = 'blog', 
    limit: number = 10
): Promise<{ posts: SteemPost[] | null; error: string | null; }> {
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
                method: 'bridge.get_account_posts',
                params: { sort, account: username, limit: limit },
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
            throw new Error(json.error.message || `Steem API returned an unspecified error for ${sort} posts`);
        }

        return { posts: json.result || [], error: null };

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { posts: null, error: `Request to Steem API for ${sort} posts timed out.` };
        }
        console.error(`Critical error in getSteemUserPosts (${sort}) for ${username}:`, error);
        return { posts: null, error: error.message || 'An unknown server error occurred.' };
    }
}

/**
 * Fetches notifications for a Steem user account from the Steem blockchain.
 */
export async function getSteemAccountNotifications(
    username: string,
    limit: number = 50,
    lastId?: number
): Promise<{ notifications: SteemNotification[] | null; error: string | null; }> {
    if (!username) {
        return { notifications: null, error: 'No username provided.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const params: Record<string, any> = { account: username, limit };
    if (lastId) {
        params.last_id = lastId;
    }

    try {
        const response = await fetch(STEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'bridge.account_notifications',
                params,
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
            throw new Error(json.error.message || 'Steem API returned an error for notifications');
        }

        return { notifications: json.result || [], error: null };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { notifications: null, error: 'Request to Steem API for notifications timed out.' };
        }
        console.error(`Critical error in getSteemAccountNotifications for ${username}:`, error);
        return { notifications: null, error: error.message || 'An unknown server error occurred.' };
    }
}

/**
 * Fetches market prices and global properties to calculate the estimated USD value of a Steem account.
 */
export async function getSteemAccountValueUSD(username: string): Promise<{ estimatedUSD: string; rawValueUSD: number; error: string | null; }> {
    if (!username) {
        return { estimatedUSD: '$0.00 EST USD', rawValueUSD: 0, error: 'No username provided' };
    }

    try {
        // Fetch raw account details and global properties in parallel
        const [accRes, dgpRes] = await Promise.all([
            fetch(STEEM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_accounts',
                    params: [[username]],
                    id: 1,
                }),
            }).then(r => r.json()),
            fetch(STEEM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_dynamic_global_properties',
                    params: [],
                    id: 1,
                }),
            }).then(r => r.json())
        ]);

        const acc = accRes?.result?.[0];
        const dgp = dgpRes?.result;

        if (!acc) {
            return { estimatedUSD: '$0.00 EST USD', rawValueUSD: 0, error: 'Account not found' };
        }

        const parseToken = (val?: string) => {
            if (!val) return 0;
            return parseFloat(val.split(' ')[0]) || 0;
        };

        const liquidSteem = parseToken(acc.balance);
        const savingsSteem = parseToken(acc.savings_balance);
        
        const liquidSbd = parseToken(acc.sbd_balance);
        const savingsSbd = parseToken(acc.savings_sbd_balance);

        const vestingShares = parseToken(acc.vesting_shares);
        const totalVestingShares = dgp ? parseToken(dgp.total_vesting_shares) : 0;
        const totalVestingFundSteem = dgp ? parseToken(dgp.total_vesting_fund_steem) : 0;

        let steemPower = 0;
        if (totalVestingShares > 0) {
            steemPower = (vestingShares / totalVestingShares) * totalVestingFundSteem;
        }

        const totalSteem = liquidSteem + savingsSteem + steemPower;
        const totalSbd = liquidSbd + savingsSbd;

        // Fetch prices (CoinGecko with fallback to standard default)
        let steemPriceUsd = 0.15;
        let sbdPriceUsd = 1.00;

        try {
            const priceController = new AbortController();
            const pTimeout = setTimeout(() => priceController.abort(), 3000);
            const pRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=steem,steem-dollars&vs_currencies=usd', { signal: priceController.signal });
            clearTimeout(pTimeout);
            if (pRes.ok) {
                const pJson = await pRes.json();
                if (pJson.steem?.usd) steemPriceUsd = pJson.steem.usd;
                if (pJson['steem-dollars']?.usd) sbdPriceUsd = pJson['steem-dollars'].usd;
            }
        } catch {
            // Price fallback
        }

        const totalUsd = (totalSteem * steemPriceUsd) + (totalSbd * sbdPriceUsd);
        const formattedUSD = `$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EST USD`;

        return { estimatedUSD: formattedUSD, rawValueUSD: totalUsd, error: null };
    } catch (err: any) {
        console.error(`Error calculating Steem account value for ${username}:`, err);
        return { estimatedUSD: '$0.00 EST USD', rawValueUSD: 0, error: err.message || 'Calculation error' };
    }
}

/**
 * Verifies if a post exists on the blockchain.
 */
export async function verifySteemPost(author: string, permlink: string): Promise<boolean> {
    try {
        const response = await fetch(STEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'condenser_api.get_content',
                params: [author, permlink],
                id: 1,
            }),
        });

        if (!response.ok) return false;
        const json = await response.json();
        
        // If author matches and it's not a dummy response
        return json.result && json.result.author === author && json.result.permlink === permlink;
    } catch (e) {
        return false;
    }
}

/**
 * Orchestrates fetching, caching, and retrieving Steem posts.
 */
export async function syncAndGetSteemPosts(userId: UserId, steemUsername: string): Promise<{ posts: SteemPost[] | null; error: string | null; }> {
    const latestCachedTimestamp = await getLatestCachedPost(userId);
    const { posts: latestSteemPosts, error: apiError } = await getSteemUserPosts(steemUsername, 'blog', 10);

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
