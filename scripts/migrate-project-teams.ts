
import admin from 'firebase-admin';
import { Command } from 'commander';

// --- TYPE DEFINITIONS ---
// Represents the old, denormalized structure with a nested user object.
type OldHydratedMember = {
    userId: string;
    role: string;
    user: { [key: string]: any; }; // The nested user object.
    createdAt: string;
};

// Represents the new, normalized structure we want to migrate to.
type NormalizedMember = {
    userId: string;
    role: string;
    createdAt: string;
    updatedAt: string;
};

// Initialize Firebase Admin SDK
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
        console.log('Initialized Firebase Admin from local service account key.');
    } catch (e) {
        console.error('Firebase Admin SDK initialization failed. Ensure service account key is available.');
        process.exit(1);
    }
}

const db = admin.firestore();

/**
 * A migration script to normalize the `team` field in all project documents.
 * It processes every team member to ensure they conform to the new `NormalizedMember` schema,
 * which includes `userId`, `role`, `createdAt`, and `updatedAt`.
 * This script correctly handles the old schema where user data was nested in a `user` field.
 */
async function migrateProjectTeams(dryRun: boolean) {
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Starting migration of project teams...`);

    const projectsRef = db.collection('projects');
    const snapshot = await projectsRef.get();

    if (snapshot.empty) {
        console.log('No projects found. Migration not needed.');
        return;
    }

    let projectsToMigrate = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const project = doc.data();
        const projectId = doc.id;

        if (!project.team || !Array.isArray(project.team)) {
            console.log(`- Project \"${project.name}\" (${projectId}) has no valid team array. Skipping.`);
            continue;
        }

        console.log(`- Processing project \"${project.name}\" (${projectId})...`);
        
        const migratedTeam: NormalizedMember[] = project.team.map((member: any): NormalizedMember => {
            const now = new Date().toISOString();
            
            // Determine the correct user ID.
            // If a nested `user` object exists, the ID is inside it.
            const userId = member.user?.id || member.userId;

            if (!userId) {
                console.warn(`  - WARNING: Skipping a team member in project ${projectId} due to missing user ID.`);
                // Return a structure that can be filtered out later if needed, though ideally this case doesn't happen.
                return null as any; 
            }

            return {
                userId: userId,
                role: member.role || 'participant', // Default to 'participant' if role is missing
                createdAt: member.createdAt || now, // Preserve existing createdAt or set new
                updatedAt: now // Always set/update the updatedAt timestamp
            };
        }).filter((m): m is NormalizedMember => m !== null); // Filter out any members that failed validation

        const projectRef = projectsRef.doc(projectId);
        if (!dryRun) {
            batch.update(projectRef, { team: migratedTeam });
        }
        projectsToMigrate++;
    }

    if (projectsToMigrate > 0) {
        if (!dryRun) {
            try {
                await batch.commit();
                console.log(`\nSuccessfully committed batch update. Migrated ${projectsToMigrate} projects.`);
            } catch (error) {
                console.error('Error committing batch update:', error);
            }
        } else {
            console.log(`\n[DRY RUN] Would have migrated team data for ${projectsToMigrate} projects.`);
        }
    } else {
        console.log('\nNo projects found to migrate.');
    }
}

async function main() {
    const program = new Command();
    program
        .version('1.0.0')
        .description('A script to migrate project team data to a normalized format.')
        .option('--dry-run', 'Simulate the migration without writing to the database', false)
        .parse(process.argv);

    const options = program.opts();

    try {
        initializeFirebaseAdmin();
        await migrateProjectTeams(options.dryRun);
        console.log('\nMigration script finished.');
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        process.exit(1);
    }
}

main();
