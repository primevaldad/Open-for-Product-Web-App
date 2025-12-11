
const admin = require('firebase-admin');
import { firestore } from 'firebase-admin';

function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('Initialized Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY.');
            return;
        } catch (e) { console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.', e); }
    }
    try {
        const serviceAccount = require('../src/lib/serviceAccountKey.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('Initialized Firebase Admin from local serviceAccountKey.json.');
        return;
    } catch (e) { /* Expected */ }

    console.error('Firebase Admin SDK initialization failed.');
    process.exit(1);
}

initializeFirebaseAdmin();

const db = admin.firestore();

async function migrateUsers(dryRun: boolean = false) {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Starting user migration to add 'createdAt' field...`);

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
        console.log("No users found in the database.");
        return;
    }

    const batch = db.batch();
    let usersToUpdateCount = 0;

    for (const doc of snapshot.docs) {
        const user = doc.data();
        if (!user.createdAt) {
            usersToUpdateCount++;
            const logMessage = `User ${doc.id} (Name: ${user.name || 'N/A'}) is missing 'createdAt'.`;
            if (dryRun) {
                console.log(`[DRY RUN] ${logMessage} Would be updated.`);
            } else {
                console.log(logMessage + " Scheduling for update.");
                batch.update(doc.ref, { createdAt: new Date().toISOString() });
            }
        }
    }

    if (usersToUpdateCount === 0) {
        console.log("All users already have the 'createdAt' field. No migration needed.");
        return;
    }

    if (dryRun) {
        console.log(`[DRY RUN] Found ${usersToUpdateCount} users that would be updated. Run without '--dry-run' to apply changes.`);
    } else {
        console.log(`Found ${usersToUpdateCount} users to update. Committing changes...`);
        try {
            await batch.commit();
            console.log(`Successfully updated ${usersToUpdateCount} users.`);
        } catch (error) {
            console.error("Error committing batch update:", error);
            throw error;
        }
    }
}

async function main() {
    // Basic command line arg parsing for --dry-run
    const dryRun = process.argv.includes('--dry-run');
    
    try {
        await migrateUsers(dryRun);
        console.log('User migration script finished successfully.');
    } catch (e) {
        console.error('An error occurred during user migration:', e);
        process.exit(1);
    }
}

main();
