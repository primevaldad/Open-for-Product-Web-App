import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey!);

if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function testSearch() {
    console.log('Testing semantic search...');
    const queryText = "apps to help the environment";
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: queryText }] },
        outputDimensionality: 768,
    } as any);
    const vectorValue = (admin.firestore.FieldValue as any).vector(result.embedding.values);

    try {
        const searchResult = await db.collection('projects')
            .where('status', '==', 'published')
            .findNearest('embedding', vectorValue, {
                limit: 5,
                distanceMeasure: 'COSINE',
            })
            .get();

        console.log(`Found ${searchResult.size} matches.`);
        searchResult.docs.forEach(doc => {
            console.log(`- ${doc.data().name}`);
        });
    } catch (error: any) {
        console.error('Search failed:', error.message);
    }
}

testSearch();
