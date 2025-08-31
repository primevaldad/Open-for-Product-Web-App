import admin from 'firebase-admin';
import { App, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apps = getApps();

const BENTO_FIREBASE_ADMIN_APP_NAME =
  'bento-firebase-admin-app-instance-do-not-use';

function getAdminApp(): App {
  if (apps.length > 0) {
    const bentoAdminApp = apps.find(
      (app) => app.name === BENTO_FIREBASE_ADMIN_APP_NAME
    );
    if (bentoAdminApp) {
      return bentoAdminApp;
    }
  }

  return initializeApp(
    {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'open-for-product',
    },
    BENTO_FIREBASE_ADMIN_APP_NAME
  );
}

const db = getFirestore(getAdminApp());

export { db };
