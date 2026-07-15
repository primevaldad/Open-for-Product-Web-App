const admin = require('firebase-admin');
const app = admin.initializeApp({ projectId: 'open-for-product' });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('projectMatchThreads').limit(1).get();
  if (!snap.empty) {
    const thread = snap.docs[0];
    const token = '1234567890abcdef1234567890abcdef';
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await thread.ref.update({
      tokenHash,
      tokenExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000000)),
      status: 'open'
    });
    console.log('token=' + token + '&threadId=' + thread.id);
  }
}
run();
