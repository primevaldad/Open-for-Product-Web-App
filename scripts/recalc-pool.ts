import { adminDb } from '../src/lib/firebase.server';
import type { FundryContribution } from '../src/lib/types';

async function main() {
    console.log('Recalculating pool for project...');
    const projectId = 'fogJMQYIZxnlsMMa2cU3';
    
    const contributionsRef = adminDb.collection('projects').doc(projectId).collection('fundingContributions');
    const snapshot = await contributionsRef.get();
    
    let confirmed = 0;
    let pending = 0;
    let pledged = 0;
    let placeholder = 0;

    snapshot.docs.forEach(doc => {
        const c = doc.data() as FundryContribution;
        
        // Skip contributions directed to a specific goal
        if (c.goalId && c.goalId !== 'pool_general') {
            return;
        }

        if (c.status === 'confirmed') {
            const netAmount = c.amount - (c.refundedAmount || 0);
            confirmed += netAmount > 0 ? netAmount : 0;
        } else if (c.status === 'pending_collection' || c.status === 'pending_confirmation') {
            pending += c.amount;
        } else if (c.status === 'pledged') {
            pledged += c.amount;
        } else if (c.status === 'placeholder') {
            placeholder += c.amount;
        }
    });

    await adminDb.collection('projects').doc(projectId).update({
        'fundry.pool.confirmedAmount': confirmed,
        'fundry.pool.pendingCollectionAmount': pending,
        'fundry.pool.pledgedAmount': pledged,
        'fundry.pool.placeholderAmount': placeholder
    });
    console.log('Done!');
}

main().catch(console.error);
