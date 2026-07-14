
/**
 * Make Me Lead Script (Firestore Version)
 *
 * This script finds a user by their email and updates their role to 'lead'
 * in all projects they are a member of in a Firestore database.
 *
 * To run this script:
 * 1. Make sure your environment is configured to connect to Firebase.
 *    This can be done via a serviceAccountKey.json file, or environment variables
 *    like GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY.
 * 2. Set the USER_EMAIL variable below to your email address.
 * 3. Run the script from your terminal:
 *    npx tsx scripts/make-me-lead.ts
 */

import * as admin from 'firebase-admin';
import type { User } from '../src/lib/types'; // Import the User type

// --- CONFIGURATION ---
// Set this to the email address of the user you want to make a lead.
const USER_EMAIL = 'user@example.com'; 
// --------------------

function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return;
    }

    // Try to initialize with default credentials (useful for GCP environments)
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        console.log('Initialized Firebase Admin with Application Default Credentials.');
        return;
    } catch (e) {
        // Silently ignore and try the next method
    }

    // Try to initialize from a service account key in an environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Initialized Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY env var.');
            return;
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.', e);
        }
    }
    
    // Fallback for local development: try to use a local file
    try {
        const serviceAccount = require('../serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Initialized Firebase Admin from local serviceAccountKey.json file.');
        return;
    } catch (e) {
         // Silently ignore if the file doesn't exist.
    }

    console.error('Firebase Admin SDK initialization failed. Please configure your credentials.');
    process.exit(1);
}

async function main() {
    console.log('🚀 Starting the make-me-lead script...');
    
    initializeFirebaseAdmin();
    const db = admin.firestore();

    if (USER_EMAIL === 'user@example.com') {
        console.error("❌ Please update the USER_EMAIL variable in the script with your email address.");
        return;
    }
    
    console.log(`Looking for user: ${USER_EMAIL}`);

    // 1. Find the user by email
    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', USER_EMAIL).limit(1).get();

    if (userSnapshot.empty) {
        console.error(`❌ Error: User with email '${USER_EMAIL}' not found.`);
        return;
    }

    const userDoc = userSnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as User; // Apply the User type

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);

    // 2. Find all projects and update team roles
    const projectsRef = db.collection('projects');
    const projectsSnapshot = await projectsRef.get();

    if (projectsSnapshot.empty) {
        console.log('🤷 No projects found in the database. Nothing to do.');
        return;
    }

    console.log(`Found ${projectsSnapshot.docs.length} projects. Checking memberships...`);

    let updatedCount = 0;
    const updatePromises = [];

    for (const projectDoc of projectsSnapshot.docs) {
        const project = projectDoc.data();
        let team = project.team || [];
        const teamNeedsUpdate = false;

        // Find the user in the team array
        const userMembership = team.find((member: any) => member.userId === user.id);

        if (userMembership && userMembership.role !== 'lead') {
            console.log(`  - Found user in project: '${project.name}'. Updating role to 'lead'.`);
            
            // Update the user's role
            team = team.map((member: any) => 
                member.userId === user.id ? { ...member, role: 'lead' } : member
            );
            
            const projectRef = projectDoc.ref;
            updatePromises.push(projectRef.update({ team: team }));
            updatedCount++;
        } else if (userMembership) {
            console.log(`  - User is already a 'lead' in project: '${project.name}'. Skipping.`);
        }
    }

    // Execute all the updates
    await Promise.all(updatePromises);

    if (updatedCount > 0) {
        console.log(`
🎉 Success! Updated ${updatedCount} project(s) to give '${user.name}' lead privileges.`);
    } else {
        console.log(`
✨ All projects are already up to date. No changes were needed.`);
    }
}

main()
    .catch((e) => {
        console.error('An unexpected error occurred:', e);
        process.exit(1);
    })
    .finally(() => {
        console.log('👋 Script finished.');
    });
