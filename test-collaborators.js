const admin = require('firebase-admin');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'demo-open-for-product',
});
const adminDb = admin.firestore();

async function run() {
    // get user ID for OfPProjects
    const users = await adminDb.collection('users').get();
    let currentUser;
    for (const doc of users.docs) {
       // Just grab the first user to test logic
       currentUser = doc.data();
       currentUser.id = doc.id;
       break;
    }
    
    if (!currentUser) return console.log("No user");

    const projectsSnap = await adminDb.collection('projects').get();
    
    const allMemberIds = new Set();
    
    projectsSnap.docs.forEach(doc => {
        const data = doc.data();
        const isMember = data.ownerId === currentUser.id || (data.team && data.team.some(m => m.userId === currentUser.id));
        
        if (isMember) {
            if (data.ownerId) allMemberIds.add(data.ownerId);
            if (data.team) data.team.forEach(m => allMemberIds.add(m.userId));
        }
    });

    allMemberIds.delete(currentUser.id);

    console.log("Collaborator IDs:", Array.from(allMemberIds));
    process.exit(0);
}
run();
