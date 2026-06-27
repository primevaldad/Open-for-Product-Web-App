'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { applyActionCode, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { Suspense } from 'react';

/**
 * This page handles the Firebase verification link.
 * When the user clicks the link in their email, they land here with
 * `?mode=verifyEmail&oobCode=XXXX` in the URL.
 *
 * We use the Firebase *client* SDK's `applyActionCode` to consume the oobCode,
 * then refresh the session cookie so the server knows the email is verified.
 */
function ConfirmEmailContent() {
    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const verifStarted = useRef(false);

    useEffect(() => {
        // Prevent double execution in React StrictMode
        if (verifStarted.current) return;

        async function verify() {
            if (!oobCode || mode !== 'verifyEmail') {
                setStatus('error');
                setErrorMessage('Invalid verification link.');
                return;
            }

            verifStarted.current = true;
            setStatus('loading');

            try {
                // Apply the verification code using the Firebase client SDK
                await applyActionCode(auth, oobCode);

                // Wait for the Client SDK Auth state to initialize if it's currently null
                await new Promise<void>((resolve) => {
                    const unsubscribe = auth.onAuthStateChanged((user) => {
                        unsubscribe();
                        resolve();
                    });
                });

                // Refresh the current user so emailVerified is up to date
                const user = auth.currentUser;
                if (user) {
                    await user.reload();
                    // Get a fresh token that includes emailVerified: true
                    const freshToken = await getIdToken(user, true);
                    // Re-mint the session cookie with the updated claim
                    await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: freshToken }),
                    });
                }

                setStatus('success');
            } catch (err: any) {
                console.error('[VERIFY_CONFIRM] applyActionCode failed:', err);
                const code = err?.code || '';
                if (code === 'auth/invalid-action-code') {
                    setErrorMessage('This verification link has expired or has already been used.');
                } else if (code === 'auth/expired-action-code') {
                    setErrorMessage('This verification link has expired. Please request a new one.');
                } else {
                    setErrorMessage('Something went wrong while verifying your email. Please try again.');
                }
                setStatus('error');
            }
        }

        verify();
    }, [oobCode, mode]);

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF6]">
                <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2E73FF] border-t-transparent" />
                    <p className="text-gray-700">Verifying your email…</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#2E73FF] to-[#6FFFE9] text-gray-900">
                <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
                    <h1 className="mb-4 text-2xl font-bold text-[#2E73FF]">✅ Email Verified!</h1>
                    <p className="mb-6 text-gray-700">
                        Your email address has been successfully verified. You now have full access to Open for Product.
                    </p>
                    <Link
                        href="/home"
                        className="inline-block rounded-md bg-[#2E73FF] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a5bed]"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FF6B6B] to-[#FFC857] text-gray-900">
            <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
                <h1 className="mb-4 text-2xl font-bold text-[#FF6B6B]">❌ Verification Failed</h1>
                <p className="mb-6 text-gray-700">{errorMessage}</p>
                <div className="flex flex-col gap-3">
                    <Link
                        href="/verify-email"
                        className="inline-block rounded-md bg-[#2E73FF] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#1a5bed]"
                    >
                        Request New Verification Email
                    </Link>
                    <Link
                        href="/home"
                        className="inline-block text-sm text-muted-foreground underline"
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ConfirmEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <p>Loading…</p>
            </div>
        }>
            <ConfirmEmailContent />
        </Suspense>
    );
}
