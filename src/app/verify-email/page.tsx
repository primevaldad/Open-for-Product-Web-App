import { Suspense } from 'react';
import VerifyEmailClientPage from './verify-client-page';
import { getAuthenticatedUser } from '@/lib/session.server';
import { adminDb } from '@/lib/data.server';

export default async function VerifyEmailPage() {
    const user = await getAuthenticatedUser();

    // Read the verificationEmailSentAt timestamp from Firestore so the client
    // can initialize its cooldown correctly (survives page reloads).
    let lastSentIso: string | null = null;
    if (user) {
        const userDoc = await adminDb.collection('users').doc(user.id).get();
        const data = userDoc.data();
        const ts = data?.verificationEmailSentAt?.toDate?.();
        if (ts) {
            lastSentIso = ts.toISOString();
        }
    }

    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <VerifyEmailClientPage
                email={user?.email}
                isVerified={user?.emailVerified}
                lastSentAt={lastSentIso}
            />
        </Suspense>
    );
}
