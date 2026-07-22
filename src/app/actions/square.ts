'use server';

import { SquareClient, SquareEnvironment } from 'square';
import { adminDb } from '@/lib/firebase.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById } from '@/lib/data.server';
import { revalidatePath } from 'next/cache';
import type { ServerActionResponse, FundryContribution, FundryLedgerEntry } from '@/lib/types';
import * as crypto from 'crypto';

// Initialize Square Client lazily from environment variables
function getSquareClient() {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('Square configuration missing: Access Token is not set.');
    }
    const env = process.env.SQUARE_ENVIRONMENT === 'production' 
        ? SquareEnvironment.Production 
        : SquareEnvironment.Sandbox;
        
    return new SquareClient({
        token: accessToken,
        environment: env,
    });
}

/**
 * Creates a pending FundryContribution record in Firestore and generates a Square payment link.
 */
export async function createSquareCheckoutLinkAction(
    projectId: string,
    amount: number,
    goalId: string | null,
    contributorName: string,
    contributorEmail?: string | null
): Promise<ServerActionResponse<{ checkoutUrl: string; contributionId: string }>> {
    try {
        const currentUser = await getAuthenticatedUser();
        const contributorId = currentUser ? currentUser.id : null;

        // 1. Validation
        if (amount <= 0) {
            return { success: false, error: 'Contribution amount must be greater than zero.' };
        }
        if (!contributorName.trim()) {
            return { success: false, error: 'Contributor name is required.' };
        }

        const project = await findProjectById(projectId, currentUser);
        if (!project) {
            return { success: false, error: 'Project not found.' };
        }
        if (!project.fundry?.enabled) {
            return { success: false, error: 'Fundry is not enabled on this project.' };
        }

        if (goalId && goalId !== 'pool_general') {
            const goalSnap = await adminDb.collection('projects').doc(projectId)
                .collection('fundingGoals').doc(goalId).get();
            if (!goalSnap.exists) {
                return { success: false, error: 'Target funding goal not found.' };
            }
        }

        const locationId = process.env.SQUARE_LOCATION_ID;
        if (!locationId) {
            return { success: false, error: 'Square configuration missing: Location ID is not set.' };
        }

        // 2. Create pending contribution document in Firestore
        const contributionsRef = adminDb.collection('projects').doc(projectId).collection('fundingContributions');
        const docRef = contributionsRef.doc();
        const contributionId = docRef.id;

        const idempotencyKey = crypto.randomUUID();

        const pendingContribution: FundryContribution = {
            id: contributionId,
            projectId,
            goalId: goalId === 'pool_general' ? null : goalId,
            contributorId,
            contributorName,
            contributorEmail: contributorEmail || null,
            amount,
            currency: 'USD',
            contributionType: 'processor',
            processor: 'square',
            paymentProcessor: 'square',
            status: 'pending_checkout',
            squarePaymentLinkId: null,
            squareOrderId: null,
            squarePaymentId: null,
            squareCheckoutUrl: null,
            processorStatus: 'pending_checkout',
            processorReferenceId: contributionId,
            refundedAmount: 0,
            refundIds: [],
            disputeIds: [],
            idempotencyKey,
            note: `Fundry contribution to project ${project.name}`,
            createdAt: new Date().toISOString(),
            confirmedAt: null,
            lastProcessorEventAt: null,
            externalReferenceId: null
        };

        // Write to Firestore initially
        await docRef.set(pendingContribution);

        // 3. Request Square Checkout Payment Link
        const client = getSquareClient();
        let paymentLink: any = null;

        try {
            const response = await client.checkout.paymentLinks.create({
                idempotencyKey,
                order: {
                    locationId,
                    referenceId: contributionId,
                    metadata: {
                        fundryContributionId: contributionId,
                        projectId,
                        goalId: goalId || 'pool_general',
                        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
                    },
                    lineItems: [
                        {
                            name: `Fundry Contribution - ${project.name}`,
                            quantity: '1',
                            basePriceMoney: {
                                amount: BigInt(Math.round(amount * 100)), // Value in cents
                                currency: 'USD'
                            }
                        }
                    ]
                },
                paymentNote: `Fundry contribution ${contributionId}`,
                checkoutOptions: {
                    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}?tab=fundry&payment_status=return&contribution_id=${contributionId}`
                }
            });

            paymentLink = response.paymentLink;
            if (!paymentLink || !paymentLink.url) {
                throw new Error('Square Checkout URL was not returned by the API.');
            }
        } catch (checkoutError: any) {
            await docRef.update({
                status: 'failed',
                processorStatus: 'checkout_creation_failed',
                checkoutFailedAt: new Date().toISOString(),
                checkoutFailureReason: checkoutError.message || 'Unknown checkout creation error',
                updatedAt: new Date().toISOString()
            });
            return { success: false, error: checkoutError.message || 'Failed to create Square payment link.' };
        }

        // 4. Update the contribution with Square transaction references
        await docRef.update({
            squarePaymentLinkId: paymentLink.id || null,
            squareOrderId: paymentLink.orderId || null,
            squareCheckoutUrl: paymentLink.url || null,
            updatedAt: new Date().toISOString()
        });

        // 5. Write to ledger
        const ledgerRef = adminDb.collection('projects').doc(projectId).collection('fundryLedger').doc();
        const ledgerEntry: FundryLedgerEntry = {
            id: ledgerRef.id,
            projectId,
            entryType: 'contribution_created',
            amount,
            currencyOrCredit: 'USD',
            fromUserId: contributorId,
            toUserId: null,
            goalId: goalId === 'pool_general' ? null : (goalId || null),
            allocationId: null,
            contributionId: docRef.id,
            description: `Square checkout created for $${amount} contribution from ${contributorName}`,
            createdBy: contributorId || 'system',
            createdAt: new Date().toISOString()
        };
        await ledgerRef.set(ledgerEntry);

        return { 
            success: true, 
            data: { 
                checkoutUrl: paymentLink.url, 
                contributionId 
            } 
        };

    } catch (e: any) {
        console.error('[square] createSquareCheckoutLinkAction error:', e);
        return { success: false, error: e.message || 'Failed to create Square payment link.' };
    }
}

/**
 * Retrieves the current status of a contribution from the database.
 */
export async function getContributionStatusAction(
    projectId: string,
    contributionId: string
): Promise<ServerActionResponse<FundryContribution>> {
    try {
        const doc = await adminDb.collection('projects').doc(projectId)
            .collection('fundingContributions').doc(contributionId).get();
            
        if (!doc.exists) {
            return { success: false, error: 'Contribution not found.' };
        }

        const contribution = doc.data() as FundryContribution;

        // Fallback: If contribution is still pending_checkout, verify directly with Square API
        if (contribution.status === 'pending_checkout' && contribution.squareOrderId) {
            try {
                const client = getSquareClient();
                const response = await client.orders.get({ orderId: contribution.squareOrderId });
                const order = response.order;
                if (order && order.state === 'COMPLETED') {
                    await doc.ref.update({
                        status: 'confirmed',
                        processorStatus: 'COMPLETED',
                        confirmedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    contribution.status = 'confirmed';
                    contribution.processorStatus = 'COMPLETED';

                    await recalculateFundryPool(projectId);

                    const { createAndDispatchEvent } = await import('@/lib/events.server');
                    const { EventType } = await import('@/lib/types');
                    await createAndDispatchEvent({
                        type: EventType.FUNDING_CONTRIBUTION_ADDED,
                        actorUserId: contribution.contributorId || 'system',
                        projectId,
                        payload: {
                            amount: contribution.amount,
                            contributorName: contribution.contributorName || 'A contributor',
                            tab: 'fundry'
                        }
                    });
                }
            } catch (squareErr) {
                console.warn('[square] Direct Square order check failed:', squareErr);
            }
        }
        
        return { success: true, data: contribution };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Recalculates the aggregate Fundry pool sums for a project.
 */
export async function recalculateFundryPool(projectId: string): Promise<void> {
    const contributionsRef = adminDb.collection('projects').doc(projectId).collection('fundingContributions');
    const snapshot = await contributionsRef.get();
    
    let confirmed = 0;
    let pending = 0;
    let pledged = 0;
    let placeholder = 0;

    snapshot.docs.forEach(doc => {
        const c = doc.data() as FundryContribution;
        
        // Skip contributions directed to a specific goal (they are not part of the general pool)
        if (c.goalId && c.goalId !== 'pool_general') {
            return;
        }

        if (c.status === 'confirmed') {
            const netAmount = c.amount - (c.refundedAmount || 0);
            confirmed += netAmount > 0 ? netAmount : 0;
        } else if (c.status === 'pending_collection' || c.status === 'pending_confirmation') {
            pending += c.amount;
        } else if (c.status === 'pledged') {
            pledged += c.amount;
        } else if (c.status === 'placeholder') {
            placeholder += c.amount;
        }
    });

    await adminDb.collection('projects').doc(projectId).update({
        'fundry.pool.confirmedAmount': confirmed,
        'fundry.pool.pendingCollectionAmount': pending,
        'fundry.pool.pledgedAmount': pledged,
        'fundry.pool.placeholderAmount': placeholder
    });
}
