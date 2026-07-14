
'use server';

import * as admin from 'firebase-admin';
import { getSteemAccount, syncAndGetSteemPosts, verifySteemPost } from '@/lib/steem.server';
import { getAuthenticatedUser as getCurrentUser } from '@/lib/session.server';
import { findUserById, updateUser } from '@/lib/data.server';

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

/**
 * Server Action to generate or retrieve a verification code for the current user.
 */
export async function getOrCreateVerificationCodeAction() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: 'Not authenticated' };

    const user = await findUserById(currentUser.id);
    if (!user) return { error: 'User not found' };

    if (user.steemVerificationCode) {
        return { code: user.steemVerificationCode };
    }

    const newCode = `ofp-${Math.random().toString(36).substring(2, 15)}`;
    await updateUser(currentUser.id, { steemVerificationCode: newCode });
    
    return { code: newCode };
}

/**
 * Server Action to verify a Steem account based on a specific post.
 */
export async function verifySteemPostAction(permlink: string, steemUsername?: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: 'Not authenticated' };

    const user = await findUserById(currentUser.id);
    if (!user) return { error: 'User not found' };

    const usernameToVerify = steemUsername || user.steemUsername;
    if (!usernameToVerify) return { error: 'No Steem username provided' };

    // Testnet / Simulation Mode
    if (user.steemTestnetEnabled) {
        await updateUser(currentUser.id, { 
            steemVerified: true,
            steemUsername: usernameToVerify 
        });
        return { success: true, message: 'Verified (Simulation Mode)' };
    }

    const isVerified = await verifySteemPost(usernameToVerify, permlink);

    if (isVerified) {
        await updateUser(currentUser.id, { 
            steemVerified: true,
            steemUsername: usernameToVerify
        });
        return { success: true };
    }

    return { error: 'Could not verify post on the Steem blockchain. Please ensure it was broadcasted successfully.' };
}

/**
 * Server Action to reset Steem verification and clear the linked account.
 */
export async function resetSteemVerificationAction() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: 'Not authenticated' };

    await updateUser(currentUser.id, { 
        steemVerified: false, 
        steemUsername: '',
        steemVerificationCode: admin.firestore.FieldValue.delete() as any
    });

    return { success: true };
}
