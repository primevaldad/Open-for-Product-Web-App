
'use server';

import * as admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

let adminApp: admin.app.App;

// The service account object has to be cast to the correct type.
const serviceAccountParams = {
    type: serviceAccount.type,
    projectId: serviceAccount.project_id,
    privateKeyId: serviceAccount.private_key_id,
    privateKey: serviceAccount.private_key,
    clientEmail: serviceAccount.client_email,
    clientId: serviceAccount.client_id,
    authUri: serviceAccount.auth_uri,
    tokenUri: serviceAccount.token_uri,
    authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
    clientC509CertUrl: serviceAccount.client_x509_cert_url,
}

if (!admin.apps.length) {
    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccountParams),
        });
    } catch (e) {
        console.error("Error initializing Firebase Admin SDK:", e);
        throw new Error('Failed to initialize Firebase Admin SDK. Make sure the serviceAccountKey.json file is correctly placed and formatted.');
    }
} else {
  adminApp = admin.app();
}

export { adminApp };
