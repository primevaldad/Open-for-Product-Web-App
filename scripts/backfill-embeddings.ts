import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY is missing in .env.local');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Initialized Firebase Admin using service account key.');
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
            process.exit(1);
        }
    } else {
        console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is missing in .env.local');
        process.exit(1);
    }
}

const db = admin.firestore();

async function generateProjectEmbedding(text: string): Promise<number[] | null> {
    if (!text.trim()) return null;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const result = await model.embedContent({
            content: { role: 'user', parts: [{ text }] },
            outputDimensionality: 768,
        } as any);
        return result.embedding.values;
    } catch (error) {
        console.error('Failed to generate embedding:', error);
        return null;
    }
}

async function runBackfill() {
    console.log('Starting backfill for project embeddings...');
    
    try {
        const projectsSnap = await db.collection('projects')
            .where('status', '==', 'published')
            .get();
        
        if (projectsSnap.empty) {
            console.log('No published projects found.');
            return;
        }

        console.log(`Found ${projectsSnap.size} published projects. Checking for missing embeddings...`);

        let count = 0;
        for (const doc of projectsSnap.docs) {
            const data = doc.data();
            
            // Only backfill if embedding is missing
            if (!data.embedding) {
                console.log(`Generating embedding for project: ${data.name}...`);
                const textToEmbed = [
                    data.name,
                    data.tagline,
                    data.description,
                    (data.contributionNeeds || []).join(', '),
                    (data.tags || []).map((t: any) => t.display).join(' ')
                ].join('\n');

                const embedding = await generateProjectEmbedding(textToEmbed);
                if (embedding) {
                    console.log(`Embedding generated. Length: ${embedding.length}`);
                    await doc.ref.update({
                        embedding: (admin.firestore.FieldValue as any).vector(embedding),
                        updatedAt: new Date().toISOString()
                    });
                    console.log(`✅ Success for ${data.name}`);
                    count++;
                } else {
                    console.error(`❌ Failed for ${data.name}`);
                }
            } else {
                console.log(`Skipping ${data.name} (already has embedding)`);
            }
        }

        console.log(`Backfill complete. Updated ${count} projects.`);
    } catch (error) {
        console.error('Backfill failed:', error);
    }
}

runBackfill();
