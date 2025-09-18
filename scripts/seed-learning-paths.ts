
import { firestore } from 'firebase-admin';

const admin = require('firebase-admin');

// --- INITIALIZE FIREBASE ADMIN ---
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return;
    }
    // Try to initialize from environment variable
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
    // Fallback to local service account file
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

// --- LEARNING PATH DATA ---
const learningPathsData = [
    {
        title: "Introduction to Web Development",
        description: "A beginner-friendly path to learn the fundamentals of web development, from HTML and CSS to basic JavaScript.",
        duration: "4 Weeks",
        category: "Web Development",
        isLocked: false,
        modules: [
            {
                id: "m1",
                title: "HTML & CSS Basics",
                description: "Learn the building blocks of web pages, including structure and styling.",
                content: "Detailed content on HTML tags, CSS selectors, and the box model...",
            },
            {
                id: "m2",
                title: "JavaScript Fundamentals",
                description: "Get started with the language of the web to create interactive experiences.",
                content: "Detailed content on variables, data types, functions, and DOM manipulation...",
            },
            {
                id: "m3",
                title: "Building a Simple Web Page",
                description: "Apply your knowledge to build a complete, simple web page from scratch.",
                content: "A step-by-step guide to creating a personal portfolio page...",
            },
        ],
    },
    {
        title: "User Experience (UX) for Developers",
        description: "Learn the principles of UX design to build more intuitive and user-friendly applications.",
        duration: "3 Weeks",
        category: "Design",
        isLocked: false,
        modules: [
            {
                id: "m1",
                title: "Intro to UX Principles",
                description: "Understand core UX concepts like usability, accessibility, and user-centered design.",
                content: "Content covering Nielsen's heuristics, accessibility guidelines (WCAG), and more...",
            },
            {
                id: "m2",
                title: "User Research and Personas",
                description: "Learn how to understand your users and create personas to guide your design decisions.",
                content: "Content on survey design, user interviews, and creating effective user personas...",
            },
        ],
    },
    {
        title: "Building a Scalable Backend",
        description: "Explore concepts for building robust and scalable server-side applications.",
        duration: "6 Weeks",
        category: "Software Engineering",
        isLocked: true,
        modules: [
            {
                id: "m1",
                title: "API Design (REST & GraphQL)",
                description: "Learn the principles of designing clean and efficient APIs.",
                content: "Content comparing REST and GraphQL, best practices for endpoint design...",
            },
            {
                id: "m2",
                title: "Database Design & Optimization",
                description: "Understand how to design and optimize your database for performance and scalability.",
                content: "Content on normalization, indexing, and query optimization...",
            },
        ],
    },
    {
        title: "Product Management Essentials",
        description: "Understand the lifecycle of a product, from idea to launch and beyond.",
        duration: "5 Weeks",
        category: "Product",
        isLocked: false,
        modules: [
            {
                id: "m1",
                title: "The Product Manager Role",
                description: "Learn about the key responsibilities of a product manager.",
                content: "Content covering market analysis, defining product vision, and stakeholder management...",
            },
            {
                id: "m2",
                title: "Roadmapping and Prioritization",
                description: "Learn how to create a product roadmap and prioritize features.",
                content: "Content on using frameworks like RICE and MoSCoW for prioritization...",
            },
        ],
    },
];

async function seedLearningPaths() {
    console.log("Starting to seed learning paths...");
    const learningPathsCollection = db.collection('learningPaths');
    let pathsAdded = 0;

    for (const pathData of learningPathsData) {
        const snapshot = await learningPathsCollection.where('title', '==', pathData.title).get();
        if (snapshot.empty) {
            await learningPathsCollection.add({
                ...pathData,
                createdAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            pathsAdded++;
            console.log(`Added learning path: "${pathData.title}"`);
        } else {
            console.log(`Skipping learning path, already exists: "${pathData.title}"`);
        }
    }

    console.log(`Seeding finished. Added ${pathsAdded} new learning paths.`);
}

seedLearningPaths()
    .then(() => console.log('Learning path seeding complete.'))
    .catch((e) => {
        console.error('An error occurred during learning path seeding:', e);
        process.exit(1);
    });
