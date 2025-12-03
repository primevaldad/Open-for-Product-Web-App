
import { firestore } from 'firebase-admin';

const admin = require('firebase-admin');

// --- TYPE DEFINITIONS ---
type User = {
    id: string;
    name: string;
    title: string;
    avatarUrl: string;
    onboardingCompleted: boolean;
    aiFeaturesEnabled: boolean;
};

// This now reflects the normalized data structure we want in the database.
// It only stores the reference to the user (userId) and their role in the project.
type TeamMember = {
    userId: string;
    role: 'participant' | 'lead'; // Assigning a default role
    createdAt: string;
};

type LearningPath = {
    id: string;
    title: string;
}

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

// --- USER DATA TO ADD ---
const newUsersData = [
    { name: 'Alex Chen', title: 'Full-Stack Engineer', avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { name: 'Brenda Smith', title: 'UX/UI Designer', avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg' },
    { name: 'Charles Kim', title: 'Data Scientist', avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg' },
    { name: 'Diana Prince', title: 'Product Manager', avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg' },
    { name: 'Ethan Hunt', title: 'AI Specialist', avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg' },
    { name: 'Fiona Glenanne', title: 'Marketing Expert', avatarUrl: 'https://randomuser.me/api/portraits/women/6.jpg' },
];

// --- DATA FOR NEW PROJECTS ---
const newProjectData = [
    {
      name: 'Your First Swing',
      tagline: 'Sexy Card Game for New Experiences',
      description: `
  ### Foundational Base Pack: Just the BaSex
  An essential foundation for couples, thruples, and groups.
  (Note: “and queers” is under consideration for tone—playful vs. potentially alienating—may A/B test language depending on audience.)
  
  ### Deck Composition:
  - 1 foundational pack required per deck (e.g., Just the BaSex)
  - Add-on packs may include:
    - Reinvigorating Sex for the Long-Term Couple
    - Intimacy in the Bedroom (No Pressure)
    - Tried and True Positions for Your Next Threesome
  
  ### Key Features:
  - Color-coded card categories
  - Instructional cards and scenario-based learning
  - Therapist/coach customization potential
  - Optional app version with badge-based achievement system (non-pressuring)
  
  ### Long-term Potential:
  - Therapist/coach expansion packs
  - White-labeling for professionals
  - Inclusive, modular content for various relationship structures
      `,
      category: 'Culture & Society',
      contributionNeeds: ['Therapists', 'Coaches', 'App Developers', 'Playtesters'],
      recommendedLearningPathTitles: ['User Experience (UX) for Developers'],
    },
    {
      name: 'Growth ReposiStory',
      tagline: 'Adaptive Personal Development Tracker',
      description: `
  ## Concept
  A minimalist app modeled after GitHub's contribution graph, designed to track and encourage daily personal growth through small, adaptive tasks.
  
  ### Key Features:
  - Daily grid view with shaded squares: dim green (basic task), bright green (extra effort), gold (milestones)
  - Customizable activity goals that grow with you
  - Progressively challenging tasks based on past consistency
  - Visual, badge-based milestone tracking
  
  ### Expansion Ideas:
  - Coach/therapist modes
  - Branded activity packs / partnerships
  - Marketplace for community-created growth templates
      `,
      category: 'Learning & Research',
      contributionNeeds: ['UX/UI Designers', 'Mobile Developers', 'Behavioral Psychologists', 'Coaches'],
      recommendedLearningPathTitles: ['Introduction to Web Development', 'Product Management Essentials'],
    },
];

async function main() {
    console.log(`Start seeding ...`);

    // --- 1. ADD NEW USERS (NON-DESTRUCTIVE) ---
    const usersCollection = db.collection('users');
    console.log('Checking for and adding new users...');
    let newUsersAdded = 0;
    for (const u of newUsersData) {
        const snapshot = await usersCollection.where('name', '==', u.name).get();
        if (snapshot.empty) {
            await usersCollection.add({ ...u, onboardingCompleted: true, aiFeaturesEnabled: false });
            newUsersAdded++;
            console.log(`Created user: ${u.name}`);
        }
    }
    console.log(`Added ${newUsersAdded} new users.`);

    // --- 2. FETCH ALL USERS FOR TEAM ASSIGNMENTS ---
    const allUsersSnapshot = await usersCollection.get();
    const allUsers: User[] = allUsersSnapshot.docs.map((doc: firestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as User));
    if (allUsers.length === 0) {
        console.error("Seeding cannot proceed without users.");
        process.exit(1);
    }
    console.log(`Found ${allUsers.length} total users for team assignments.`);

    // --- 3. ENRICH EXISTING PROJECTS (NON-DESTRUCTIVE UPDATE) ---
    const projectsCollection = db.collection('projects');
    const existingProjectsSnapshot = await projectsCollection.get();
    console.log(`Found ${existingProjectsSnapshot.docs.length} existing projects. Enriching teams...`);

    const updatePromises: Promise<firestore.WriteResult>[] = [];
    for (const projectDoc of existingProjectsSnapshot.docs) {
        const project = projectDoc.data();
        const currentTeam: TeamMember[] = project.team || [];
        const currentTeamIds = currentTeam.map((m: TeamMember) => m.userId);

        const availableUsers = allUsers.filter((u: User) => !currentTeamIds.includes(u.id));
        const shuffledUsers = availableUsers.sort(() => 0.5 - Math.random());
        const numToAdd = Math.floor(Math.random() * 2) + 2; // 2 or 3
        
        const newMembers: TeamMember[] = shuffledUsers.slice(0, numToAdd).map((user: User) => ({
            userId: user.id,
            role: 'participant', // Assigning a default role
            createdAt: new Date().toISOString(),
        }));

        if (newMembers.length > 0) {
            const updatedTeam = [...currentTeam, ...newMembers];
            updatePromises.push(projectDoc.ref.update({ team: updatedTeam }));
            console.log(`Adding ${newMembers.length} members to \"${project.name}\"`);
        }
    }
    await Promise.all(updatePromises);
    console.log('Finished enriching existing projects.');

    // --- 4. CREATE 2 NEW TEST PROJECTS ---
    const learningPathsSnapshot = await db.collection('learningPaths').get();
    const allLearningPaths: LearningPath[] = learningPathsSnapshot.docs.map((doc: firestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as LearningPath));

    let newProjectsCreated = 0;
    console.log('Adding 2 new test projects...');

    for (const p of newProjectData) {
        const snapshot = await projectsCollection.where('name', '==', p.name).get();
        if (snapshot.empty) {
            const shuffledUsers = allUsers.sort(() => 0.5 - Math.random());
            const teamSize = Math.floor(Math.random() * 2) + 2; // 2 or 3
            const teamMembers: TeamMember[] = shuffledUsers.slice(0, teamSize).map((user: User) => ({
                userId: user.id,
                role: 'participant', // Assigning a default role
                createdAt: new Date().toISOString(),
            }));
            
            const recommendedLearningPathIds = allLearningPaths
                .filter(lp => p.recommendedLearningPathTitles.includes(lp.title))
                .map(lp => lp.id);

            await projectsCollection.add({
                name: p.name,
                tagline: p.tagline,
                description: p.description,
                category: p.category,
                contributionNeeds: p.contributionNeeds,
                status: 'published',
                progress: Math.floor(Math.random() * 75) + 10,
                votes: Math.floor(Math.random() * 250) + 50,
                timeline: 'Q4 2024',
                startDate: new Date().toISOString(),
                team: teamMembers,
                discussions: [],
                governance: { contributorsShare: 70, communityShare: 20, sustainabilityShare: 10 },
                recommendedLearningPathIds,
            });
            newProjectsCreated++;
            console.log(`Created new project: \"${p.name}\" with ${teamMembers.length} members.`);
        } else {
            console.log(`Skipping creation of \"${p.name}\" as it already exists.`);
        }
    }
    console.log(`Created ${newProjectsCreated} new projects.`);

    console.log(`Seeding finished.`);
}

main()
    .then(() => console.log('Firestore seeding complete.'))
    .catch((e) => {
        console.error('An error occurred:', e);
        process.exit(1);
    });
