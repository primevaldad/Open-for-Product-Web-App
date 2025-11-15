'use client';

import { Client } from 'dsteem';

// A specific interface for our app's needs
export interface SteemAccount {
    name: string;
    post_count: number;
    json_metadata: string;
    reputation: string;
    voting_power: number;
    balance: string;
    [key: string]: any; // Allow other properties
}

const client = new Client('https://api.steemit.com');

export async function getSteemUser(username: string): Promise<SteemAccount | null> {
    try {
        const accounts = await client.database.getAccounts([username]);
        if (accounts.length > 0) {
            return accounts[0] as SteemAccount;
        }
        return null;
    } catch (error) {
        console.error('Error fetching Steem user:', error);
        return null;
    }
}
