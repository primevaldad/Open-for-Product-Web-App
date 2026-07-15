const admin = require('firebase-admin');
const app = admin.initializeApp({ projectId: 'open-for-product' });
const db = admin.firestore();
async function run() {
  const snap = await db.collection('ofp_project_match_tokens').limit(1).get();
  if (!snap.empty) {
    console.log(snap.docs[0].id);
    console.log(snap.docs[0].data());
  } else {
    console.log('No tokens');
  }
}
run();
