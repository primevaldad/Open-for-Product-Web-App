'use server';

import type { SteemAccount } from '@/lib/types';

const STEEM_API_URL = 'https://api.steemit.com';

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
 * This approach is library-free and includes a timeout to prevent hangs.
 * @returns An object containing the account data or an error message.
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
                method: 'condenser_api.get_accounts', // Using condenser_api for simplicity
                params: [[username]],
                id: 1,
            }),
            signal: controller.signal, // Abort signal for timeout
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
