'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

/**
 * After the server-side route handler applies the oobCode,
 * this page refreshes the Firebase client token and re-mints
 * the session cookie so that emailVerified: true is reflected
 * everywhere (banner disappears, server actions ungate).
 */
export default function VerifyEmailSuccessPage() {
  const [sessionRefreshed, setSessionRefreshed] = useState(false);

  useEffect(() => {
    async function refreshSession() {
      try {
        const user = auth.currentUser;
        if (user) {
          // Force Firebase to fetch the latest user record (with emailVerified: true)
          await user.reload();
          // Get a fresh ID token that includes the updated emailVerified claim
          const freshToken = await getIdToken(user, /* forceRefresh */ true);
          // Re-mint the session cookie with the fresh token
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: freshToken }),
          });
          setSessionRefreshed(true);
        }
      } catch (err) {
        // Non-critical — the user is verified in Firebase Auth regardless.
        // Next login will pick up the updated state.
        console.warn('[VERIFY_SUCCESS] Could not refresh session cookie:', err);
      }
    }
    refreshSession();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#2E73FF] to-[#6FFFE9] text-gray-900">
      <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="mb-4 text-2xl font-bold text-[#2E73FF]">✅ Email Verified!</h1>
        <p className="mb-6 text-gray-700">
          Your email address has been successfully verified. You now have full access to Open for Product.
        </p>
        <Link
          href="/projects"
          className="inline-block rounded-md bg-[#2E73FF] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a5bed]"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
