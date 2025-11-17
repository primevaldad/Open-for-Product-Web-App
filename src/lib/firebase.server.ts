import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import type { SteemPost, UserId } from '@/lib/types';

function getServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found. Relying on default credentials. This is expected in a GCP environment.');
    return undefined;
  }
  try {
    const parsedKey = JSON.parse(serviceAccountKey);
    parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
    return parsedKey;
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.', e);
    return undefined;
  }
}

const serviceAccount = getServiceAccount();

if (!getApps().length) {
  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : undefined,
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'open-for-product'}.firebaseio.com`,
  });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

const POSTS_COLLECTION = 'steemPosts';

/**
 * Gets the timestamp of the most recent post cached for a user.
 * @returns The `created` date of the latest post, or null if none exist.
 */
export async function getLatestCachedPost(userId: UserId): Promise<string | null> {
  try {
    const snapshot = await adminDb
      .collection(`users/${userId}/${POSTS_COLLECTION}`)
      .orderBy('created', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const post = snapshot.docs[0].data() as SteemPost;
    return post.created;
  } catch (error) {
    console.error(`Error getting latest cached post for user ${userId}:`, error);
    return null;
  }
}

/**
 * Retrieves all cached Steem posts for a user from Firestore.
 */
export async function getCachedPosts(userId: UserId): Promise<SteemPost[]> {
  try {
    const snapshot = await adminDb
      .collection(`users/${userId}/${POSTS_COLLECTION}`)
      .orderBy('created', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as SteemPost);
  } catch (error) {
    console.error(`Error getting cached posts for user ${userId}:`, error);
    return [];
  }
}

/**
 * Saves new Steem posts to the Firestore cache for a user.
 */
export async function saveSteemPosts(userId: UserId, posts: SteemPost[]): Promise<void> {
  if (posts.length === 0) {
    return;
  }

  const batch = adminDb.batch();
  const postsCollection = adminDb.collection(`users/${userId}/${POSTS_COLLECTION}`);

  posts.forEach(post => {
    // Use post_id as the document ID to prevent duplicates
    const docRef = postsCollection.doc(String(post.post_id)); 
    batch.set(docRef, post);
  });

  try {
    await batch.commit();
  } catch (error) {
    console.error(`Error saving Steem posts for user ${userId}:`, error);
  }
}

export { adminDb, adminAuth };
