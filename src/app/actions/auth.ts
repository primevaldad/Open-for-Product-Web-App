
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

import { adminDb, logOrphanedUser, findUserById } from '@/lib/data.server';
import { createSessionCookie, clearSessionCookie, adminAuth, getAuthenticatedUser } from '@/lib/session.server';
import { sendFastmailEmail } from '@/lib/fastmail.server';
import type { User } from '@/lib/types';
import { FirebaseError } from 'firebase/app';
import { checkAndConsumeInvites } from './invites';

const SignUpSchema = z.object({
  idToken: z.string(),
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
});

const LoginSchema = z.object({
  idToken: z.string(),
});


// --- SERVER ACTIONS ---

export async function login(values: z.infer<typeof LoginSchema>): Promise<{ success: boolean; error?: string; requiresSignup?: boolean; email?: string | null }> {
  const validatedFields = LoginSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, error: "Invalid ID token provided." };
  }

  const { idToken } = validatedFields.data;

  try {
    const uid = await createSessionCookie(idToken);
    const user = await findUserById(uid);
    if (user) {
        await checkAndConsumeInvites(user);
        // Update updatedAt on every login for inactivity tracking
        await adminDb.collection('users').doc(uid).update({
            updatedAt: FieldValue.serverTimestamp()
        });
        revalidatePath('/projects');
        return { success: true };
    } else {
        // Handle case where user has Auth account but no Firestore doc
        const email = (await adminAuth.getUser(uid)).email;
        return { success: false, requiresSignup: true, email };
    }
  } catch (error) { // Type error as FirebaseError or generic Error
    if (error instanceof FirebaseError || error instanceof Error) {
        console.error("[AUTH_ACTION_TRACE] Login Server Action Error:", error.message);
        return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred while creating the session." };
  }
}

export async function signup(values: z.infer<typeof SignUpSchema>): Promise<{ success: boolean; error?: string; userId?: string }> {
  const validatedFields = SignUpSchema.safeParse(values);

  if (!validatedFields.success) {
    console.error('[AUTH_ACTION_TRACE] Signup validation failed.', validatedFields.error);
    return { success: false, error: 'Invalid data provided.' };
  }

  const { idToken, name, email } = validatedFields.data;

  try {
    const uid = await createSessionCookie(idToken);

    await adminDb.runTransaction(async (transaction) => {
        const usersCollection = adminDb.collection('users');
        
        const orphanQuery = usersCollection.where('email', '==', email).limit(1);
        const orphanSnapshot = await transaction.get(orphanQuery);

        if (!orphanSnapshot.empty) {
            const orphanDoc = orphanSnapshot.docs[0];
            if (orphanDoc.id !== uid) {
                const orphanData = { id: orphanDoc.id, ...orphanDoc.data() } as User;
                await logOrphanedUser(orphanData);
                transaction.delete(orphanDoc.ref);
            }
        }

        const newUserRef = usersCollection.doc(uid);
        const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
          name,
          email,
          role: '',
          username: name,
          avatarUrl: '',
          bio: 'Just joined Open for Product!',
          onboardingCompleted: false,
        };
        transaction.set(newUserRef, newUser);
    });

    const user = await findUserById(uid);
    if (user) {
        await checkAndConsumeInvites(user);
    }

    revalidatePath('/onboarding');

    // We do not send the verification email here anymore.
    // The client-side AuthProvider will automatically trigger /api/auth/session
    // as soon as createUserWithEmailAndPassword succeeds client-side, which
    // is where the initial session is established and the email is dispatched.
    return { success: true, userId: uid };

  } catch (error) { // Type error as FirebaseError or generic Error
    console.error('[AUTH_ACTION_TRACE] Signup Server Action Error:', error);
    await clearSessionCookie();
    if (error instanceof FirebaseError || error instanceof Error) {
        return { success: false, error: error.message };
    }
    return {
      success: false,
      error: 'An unknown error occurred during signup.',
    };
  }
}

export async function logout() {
    try {
        await clearSessionCookie();
        revalidatePath('/', 'layout');
    } catch (error) {
        console.error("[AUTH_ACTION_TRACE] Logout Server Action Error:", error);
    }
}

export async function sendCustomVerificationEmail(email: string) {
    try {
        // Generate the verification link via Firebase Admin SDK.
        // Firebase returns a link like `https://project.firebaseapp.com/__/auth/action?oobCode=XXX&...`
        // If the user clicks that directly, Firebase's hosted handler consumes the oobCode
        // BEFORE redirecting to our app — causing "expired" errors on our side.
        // So we extract the oobCode and build a direct link to our app.
          const actionCodeSettings = {
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email/confirm`,
            handleCodeInApp: true,
          };
          const firebaseLink = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
          const firebaseLinkUrl = new URL(firebaseLink);
          const oobCode = firebaseLinkUrl.searchParams.get('oobCode');
          const apiKey = firebaseLinkUrl.searchParams.get('apiKey');
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const link = `${baseUrl}/verify-email/confirm?mode=verifyEmail&oobCode=${oobCode}&apiKey=${apiKey}`;

        const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #FFFDF6;
                    color: #1B1B1B;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }
                h1 {
                    color: #1B1B1B;
                    font-size: 24px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                p {
                    font-size: 16px;
                    line-height: 1.5;
                    margin-bottom: 24px;
                    color: #1B1B1B;
                }
                .btn-container {
                    text-align: center;
                    margin: 32px 0;
                }
                .btn {
                    background-color: #2E73FF;
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    display: inline-block;
                    transition: background-color 0.2s ease;
                }
                .btn:hover {
                    background-color: #1a5bed;
                }
                .footer {
                    text-align: center;
                    font-size: 14px;
                    color: #666666;
                    margin-top: 40px;
                }
                .highlight {
                    color: #FFC857;
                }
                .accent {
                    color: #FF6B6B;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to Open for Product!</h1>
                <p>Hi there,</p>
                <p>We're thrilled to have you join our community. To get started and unlock all features, please verify your email address by clicking the button below.</p>
                
                <div class="btn-container">
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="btn">Verify Email Address</a>
                </div>
                
                <p>If you didn't create an account, you can safely ignore this email.</p>
                
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Open for Product. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        await sendFastmailEmail(
            email,
            'Verify your email for Open for Product',
            htmlBody,
            'Open for Product'
        );

        return { success: true };
    } catch (error) {
        console.error('[AUTH_ACTION_TRACE] Failed to send custom verification email:', error);
        return { success: false, error: 'Failed to send verification email' };
    }
}

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Throttled resend action — the only path exposed to client components.
 * Enforces a 60-second server-side cooldown using `verificationEmailSentAt` in Firestore.
 * Returns `{ success, error?, cooldownRemaining? }`.
 */
export async function resendVerificationEmail(): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !user.email) {
            return { success: false, error: 'You must be logged in to resend a verification email.' };
        }

        const userRef = adminDb.collection('users').doc(user.id);

        // Use a transaction to atomically check + update the timestamp.
        // This prevents two concurrent requests from both passing the throttle.
        const throttleResult = await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const userData = userDoc.data();
            const lastSent = userData?.verificationEmailSentAt?.toDate?.();

            if (lastSent) {
                const elapsed = (Date.now() - lastSent.getTime()) / 1000;
                if (elapsed < RESEND_COOLDOWN_SECONDS) {
                    const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
                    return { allowed: false as const, remaining };
                }
            }

            // Claim the send slot by writing the timestamp inside the transaction
            transaction.update(userRef, {
                verificationEmailSentAt: FieldValue.serverTimestamp(),
            });

            return { allowed: true as const };
        });

        if (!throttleResult.allowed) {
            return {
                success: false,
                error: `Please wait ${throttleResult.remaining}s before resending.`,
                cooldownRemaining: throttleResult.remaining,
            };
        }

        // Transaction committed — we own the send slot. Send the email.
        const result = await sendCustomVerificationEmail(user.email);
        if (!result.success) {
            return { success: false, error: result.error || 'Failed to send verification email.' };
        }

        return { success: true };
    } catch (error) {
        console.error('[AUTH_ACTION_TRACE] resendVerificationEmail error:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
