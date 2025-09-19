
const admin = require('firebase-admin');

// --- INITIALIZE FIREBASE ADMIN ---
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return;
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('Initialized Firebase Admin from environment variable.');
            return;
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.', e);
        }
    }
    try {
        const serviceAccount = require('../src/lib/serviceAccountKey.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('Initialized Firebase Admin from local serviceAccountKey.json.');
    } catch (e) {
        console.error('Firebase Admin SDK initialization failed. Could not find or read service account key.', e);
        process.exit(1);
    }
}

initializeFirebaseAdmin();
const db = admin.firestore();

// --- SEED DATA ---
const badgesData = [
  {
    name: 'Clerk Master',
    learningPathId: 'cl-1', // This will need to map to a real Learning Path ID from Firestore
    moduleIds: ['cl-m1', 'cl-m2'] // These will need to map to real Module IDs
  },
  {
    name: 'Drizzle Master',
    learningPathId: 'cl-2',
    moduleIds: ['cl-m3', 'cl-m4']
  },
];

// This is a placeholder. In a real scenario, we'd fetch existing project and user IDs.
const placeholderProjectId = 'p-1';
const placeholderUserId = 'u-1';

async function seedBadges() {
    console.log("Starting to seed badges...");
    const badgesCollection = db.collection('badges');
    const badgeRefs = [];

    for (const badgeData of badgesData) {
        // Check if badge with the same name already exists
        const snapshot = await badgesCollection.where('name', '==', badgeData.name).get();
        if (snapshot.empty) {
            const badgeRef = await badgesCollection.add(badgeData);
            badgeRefs.push({ ...badgeData, id: badgeRef.id });
            console.log(`Added badge: "${badgeData.name}"`);
        } else {
            snapshot.forEach(doc => badgeRefs.push({ ...badgeData, id: doc.id }));
            console.log(`Skipping badge, already exists: "${badgeData.name}"`);
        }
    }

    console.log("Starting to seed project badge links...");
    const clerkBadge = badgeRefs.find(b => b.name === 'Clerk Master');
    const drizzleBadge = badgeRefs.find(b => b.name === 'Drizzle Master');

    if (clerkBadge) {
        await db.collection('projectBadgeLinks').add({
            projectId: placeholderProjectId,
            badgeId: clerkBadge.id,
            isRequirement: true,
        });
        console.log(`Linked Clerk Master badge to project ${placeholderProjectId}`);
    }

    if (drizzleBadge) {
        await db.collection('projectBadgeLinks').add({
            projectId: placeholderProjectId,
            badgeId: drizzleBadge.id,
            isRequirement: false,
        });
        console.log(`Linked Drizzle Master badge to project ${placeholderProjectId}`);
    }

    console.log("Starting to seed user badges...");
    if (clerkBadge) {
        await db.collection('userBadges').add({
            userId: placeholderUserId,
            badgeId: clerkBadge.id,
            earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Awarded Clerk Master badge to user ${placeholderUserId}`);
    }
    
    console.log("Badge seeding finished.");
}

seedBadges()
    .then(() => console.log('Badge seeding process complete.'))
    .catch((e) => {
        console.error('An error occurred during badge seeding:', e);
        process.exit(1);
    });
