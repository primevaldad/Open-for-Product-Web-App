import { adminDb } from '../src/lib/firebase.server';
import type { FundryContribution } from '../src/lib/types';

async function main() {
    const projectId = 'fogJMQYIZxnlsMMa2cU3';
    
    const contributionsRef = adminDb.collection('projects').doc(projectId).collection('fundingContributions');
    const snapshot = await contributionsRef.get();
    
    snapshot.docs.forEach(doc => {
        const c = doc.data() as FundryContribution;
        console.log(`ID: ${c.id}, Goal: ${c.goalId || 'pool'}, Amount: $${c.amount}, Status: ${c.status}, Source: ${c.processorName || 'manual'}`);
    });
}

main().catch(console.error);
