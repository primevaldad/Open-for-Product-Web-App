
import { firestore } from 'firebase-admin';

const admin = require('firebase-admin');

// --- TYPE DEFINITIONS ---
type LearningPath = {
    id: string;
    title: string;
}

type Project = {
    id: string;
    name: string;
}

// --- DATA TO LINK ---
// Defines which learning paths should be recommended for which projects.
const projectPathRecommendations = [
    {
      projectName: 'Your First Swing',
      learningPathTitles: ['User Experience (UX) for Developers'],
    },
    {
      projectName: 'Growth ReposiStory',
      learningPathTitles: ['Introduction to Web Development', 'Product Management Essentials'],
    },
];


function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return;
    }

    // Try to initialize from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log('Initialized Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY.');
            return;
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Checking for local key file.', e);
        }
    }

    // Fallback to local service account file
    try {
        const serviceAccount = require('../src/lib/serviceAccountKey.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('Initialized Firebase Admin from local serviceAccountKey.json.');
    } catch (e) {
        console.error('Firebase Admin SDK initialization failed. Ensure you have a service account key set up.');
        process.exit(1);
    }
}

async function main() {
    initializeFirebaseAdmin();
    const db = admin.firestore();

    console.log('Starting to create project-learning path links...');

    // 1. Fetch all necessary data
    const learningPathsSnapshot = await db.collection('learningPaths').get();
    const allLearningPaths: LearningPath[] = learningPathsSnapshot.docs.map((doc: firestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as LearningPath));

    const projectsSnapshot = await db.collection('projects').get();
    const allProjects: Project[] = projectsSnapshot.docs.map((doc: firestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Project));
    
    const projectPathLinksCollection = db.collection('projectPathLinks');
    let linksCreated = 0;

    // 2. Iterate through our desired recommendations
    for (const recommendation of projectPathRecommendations) {
        const project = allProjects.find(p => p.name === recommendation.projectName);

        if (!project) {
            console.warn(`Could not find project named: "${recommendation.projectName}". Skipping.`);
            continue;
        }

        for (const pathTitle of recommendation.learningPathTitles) {
            const learningPath = allLearningPaths.find(lp => lp.title === pathTitle);

            if (!learningPath) {
                console.warn(`Could not find learning path named: "${pathTitle}". Skipping.`);
                continue;
            }

            // 3. Check if the link already exists
            const linkQuery = await projectPathLinksCollection
                .where('projectId', '==', project.id)
                .where('learningPathId', '==', learningPath.id)
                .get();

            // 4. If it doesn't exist, create it
            if (linkQuery.empty) {
                await projectPathLinksCollection.add({ 
                    projectId: project.id, 
                    learningPathId: learningPath.id 
                });
                linksCreated++;
                console.log(`Linked "${project.name}" to "${learningPath.title}"`);
            }
        }
    }

    console.log(`---`);
    if (linksCreated > 0) {
        console.log(`Successfully created ${linksCreated} new project-learning path links.`);
    } else {
        console.log('All required project-learning path links already exist. No new links were created.');
    }
}

main()
    .then(() => {
        console.log('Link creation script finished successfully.');
        process.exit(0);
    })
    .catch((e) => {
        console.error('An error occurred during the link creation script:', e);
        process.exit(1);
    });
