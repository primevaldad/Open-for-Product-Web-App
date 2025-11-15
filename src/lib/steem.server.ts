
import { Client } from 'dsteem';

const STEEM_API_URL = 'https://api.steemit.com';

const client = new Client(STEEM_API_URL);

/**
 * Fetches a Steem account by username.
 * @param username The Steem username to fetch.
 * @returns The Steem account object, or null if not found.
 */
export async function getSteemAccount(username: string) {
    try {
        const accounts = await client.database.getAccounts([username]);
        return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
        console.error(`Error fetching Steem account ${username}:`, error);
        return null;
    }
}
