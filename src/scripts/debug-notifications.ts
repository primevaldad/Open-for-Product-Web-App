import { adminDb } from '@/lib/data.server';

async function checkNotifications() {
    const snapshot = await adminDb.collection('notifications').limit(5).get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    console.log('Sample Notifications:', JSON.stringify(docs, null, 2));
}

checkNotifications().catch(console.error);
