import { loadEnvConfig } from '@next/env';
loadEnvConfig('./');
import * as admin from 'firebase-admin';

function getServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) return undefined;
  const parsedKey = JSON.parse(serviceAccountKey);
  parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
  return parsedKey;
}

if (!admin.apps.length) {
  const sa = getServiceAccount();
  if (sa) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp();
  }
}
const adminDb = admin.firestore();

async function run() {
    // get user Favor Prime
    const users = await adminDb.collection('users').get();
    let currentUser;
    for (const doc of users.docs) {
       const data = doc.data();
       if (data.name === 'Favor Prime' || data.name?.includes('Favor')) {
           currentUser = { id: doc.id, ...data };
           break;
       }
    }
    
    if (!currentUser) {
        console.log("Favor not found");
        process.exit(0);
    }
    console.log("Found Favor:", currentUser.id);

    const projectsSnap = await adminDb.collection('projects').get();
    const allMemberIds = new Set<string>();
    
    projectsSnap.docs.forEach(doc => {
        const data = doc.data();
        const isMember = data.ownerId === currentUser.id || (data.team && data.team.some((m: any) => m.userId === currentUser.id));
        
        if (isMember) {
            console.log("Favor is member of:", doc.id, data.name);
            if (data.ownerId) allMemberIds.add(data.ownerId);
            if (data.team) data.team.forEach((m: any) => allMemberIds.add(m.userId));
        }
    });

    allMemberIds.delete(currentUser.id);
    console.log("Collab IDs:", Array.from(allMemberIds));
    
    if (allMemberIds.size > 0) {
        const memberIds = Array.from(allMemberIds);
        const usersList = [];
        for (let i = 0; i < memberIds.length; i += 30) {
            const chunk = memberIds.slice(i, i + 30);
            const userSnap = await adminDb.collection('users')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();
            
            userSnap.docs.forEach(doc => {
                const data = doc.data();
                usersList.push({ id: doc.id, name: data.name, email: data.email });
            });
        }
        console.log("Collaborators:", usersList);
    }

    process.exit(0);
}
run().catch(console.error);
