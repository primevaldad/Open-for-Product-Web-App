import { NextRequest } from 'next/server';
import { WebhooksHelper } from 'square';
import { adminDb } from '@/lib/firebase.server';
import { recalculateFundryPool } from '@/app/actions/square';
import type { FundryContribution, FundryLedgerEntry } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-square-hmacsha256-signature');
        const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host') || 'localhost:3000';
        const notificationUrl = `${proto}://${host}/api/webhooks/square`;

        // 1. Signature Verification
        if (signatureKey) {
            if (!signature) {
                console.error('[webhook] Missing x-square-hmacsha256-signature header.');
                let parsedEventType = 'unknown';
                try { parsedEventType = JSON.parse(rawBody).type; } catch (e) {}
                await adminDb.collection('webhook_delivery_failures').doc().set({
                    reason: 'missing_signature',
                    timestamp: new Date().toISOString(),
                    eventType: parsedEventType,
                    notificationUrl,
                    rawBodySnippet: rawBody.substring(0, 500)
                });
                return new Response('Forbidden: Missing signature', { status: 400 });
            }
            const isValid = await WebhooksHelper.verifySignature({
                requestBody: rawBody,
                signatureHeader: signature,
                signatureKey,
                notificationUrl
            });
            if (!isValid) {
                console.error('[webhook] Square signature verification failed.');
                let parsedEventType = 'unknown';
                try { parsedEventType = JSON.parse(rawBody).type; } catch (e) {}
                await adminDb.collection('webhook_delivery_failures').doc().set({
                    reason: 'invalid_signature',
                    timestamp: new Date().toISOString(),
                    eventType: parsedEventType,
                    notificationUrl,
                    rawBodySnippet: rawBody.substring(0, 500)
                });
                return new Response('Forbidden: Invalid Signature', { status: 403 });
            }
        } else {
            console.warn('[webhook] SQUARE_WEBHOOK_SIGNATURE_KEY is not defined. Skipping signature check.');
        }

        const event = JSON.parse(rawBody);
        const eventId = event.event_id;

        // Check if this is an event type we care to process
        const supportedEvents = ['payment.created', 'payment.updated', 'order.updated'];
        if (!supportedEvents.includes(event.type)) {
            console.log(`[webhook] Event type ${event.type} is not processed by Fundry. Acknowledging event with 200 OK.`);
            return new Response('Success (event type not handled)', { status: 200 });
        }

        // 2. Idempotency Check
        const eventRef = adminDb.collection('processed_webhook_events').doc(eventId);
        const eventSnap = await eventRef.get();
        if (eventSnap.exists) {
            return new Response('Already processed', { status: 200 });
        }

        console.log(`[webhook] Processing Square event type: ${event.type}, eventId: ${eventId}`);

        // 3. Extract IDs and references from the event payload
        let squareOrderId: string | null = null;
        let referenceId: string | null = null; // fundryContributionId
        let status: FundryContribution['status'] | null = null;
        let squarePaymentId: string | null = null;
        let processorStatus: string | null = null;
        
        let refundedAmount: number | null = null;
        let refundId: string | null = null;
        let disputeId: string | null = null;

        const eventData = event.data?.object;

        if (event.type.startsWith('payment.')) {
            const payment = eventData?.payment;
            if (payment) {
                squarePaymentId = payment.id || null;
                squareOrderId = payment.order_id || null;
                referenceId = payment.reference_id || null;
                processorStatus = payment.status || null;

                if (payment.status === 'COMPLETED') {
                    status = 'confirmed';
                } else if (payment.status === 'FAILED') {
                    status = 'failed';
                } else if (payment.status === 'CANCELED') {
                    status = 'cancelled';
                }

                // Handle refunds
                if (payment.refund_ids && payment.refund_ids.length > 0) {
                    refundId = payment.refund_ids[0];
                    status = 'refunded';
                    if (payment.refunded_money?.amount) {
                        refundedAmount = Number(payment.refunded_money.amount) / 100;
                    }
                }
            }
        } else if (event.type === 'order.updated') {
            const order = eventData?.order;
            if (order) {
                squareOrderId = order.id || null;
                referenceId = order.reference_id || order.metadata?.fundryContributionId || null;
                processorStatus = order.state || null;

                if (order.state === 'COMPLETED') {
                    status = 'confirmed';
                } else if (order.state === 'CANCELED') {
                    status = 'cancelled';
                }
            }
        }

        // 4. Find the matching FundryContribution document in Firestore
        let contributionDoc: any = null;
        let projectId: string | null = null;

        if (referenceId) {
            // Collection Group query to search for the contribution ID
            const querySnap = await adminDb.collectionGroup('fundingContributions')
                .where('id', '==', referenceId).get();
            if (!querySnap.empty) {
                contributionDoc = querySnap.docs[0];
            }
        }

        if (!contributionDoc && squareOrderId) {
            // Fallback: search by squareOrderId
            const querySnap = await adminDb.collectionGroup('fundingContributions')
                .where('squareOrderId', '==', squareOrderId).get();
            if (!querySnap.empty) {
                contributionDoc = querySnap.docs[0];
            }
        }

        if (!contributionDoc) {
            console.warn(`[webhook] No matching FundryContribution found for referenceId: ${referenceId}, squareOrderId: ${squareOrderId}. Acknowledging event with 200 OK.`);
            await adminDb.collection('webhook_delivery_failures').doc().set({
                reason: 'no_matching_contribution',
                eventType: event.type,
                eventId,
                referenceId,
                squareOrderId,
                timestamp: new Date().toISOString()
            });
            return new Response('Success (no matching contribution)', { status: 200 });
        }

        const contributionData = contributionDoc.data() as FundryContribution;
        projectId = contributionData.projectId;
        const contributionRef = contributionDoc.ref;

        // 5. Update the contribution document fields
        const updates: Partial<FundryContribution> = {
            updatedAt: new Date().toISOString(),
            lastProcessorEventAt: new Date().toISOString(),
        };

        if (status) {
            updates.status = status;
        }
        if (squarePaymentId) {
            updates.squarePaymentId = squarePaymentId;
        }
        if (processorStatus) {
            updates.processorStatus = processorStatus;
        }
        if (status === 'confirmed') {
            updates.confirmedAt = new Date().toISOString();
        }

        // Handle refund additions
        if (refundId) {
            const existingRefunds = contributionData.refundIds || [];
            if (!existingRefunds.includes(refundId)) {
                updates.refundIds = [...existingRefunds, refundId];
            }
            if (refundedAmount !== null) {
                updates.refundedAmount = refundedAmount;
            }
        }

        // Handle dispute additions
        if (disputeId) {
            const existingDisputes = contributionData.disputeIds || [];
            if (!existingDisputes.includes(disputeId)) {
                updates.disputeIds = [...existingDisputes, disputeId];
            }
            updates.status = 'disputed';
        }

        await contributionRef.update(updates);

        if (status === 'confirmed') {
            const ledgerRef = adminDb.collection('projects').doc(projectId).collection('fundryLedger').doc();
            const ledgerEntry: FundryLedgerEntry = {
                id: ledgerRef.id,
                projectId,
                entryType: 'contribution_confirmed',
                amount: contributionData.amount,
                currencyOrCredit: 'USD',
                fromUserId: contributionData.contributorId || null,
                toUserId: null,
                goalId: contributionData.goalId || null,
                allocationId: null,
                contributionId: contributionData.id,
                description: `Square contribution of $${contributionData.amount} confirmed for ${contributionData.contributorName || 'contributor'}`,
                createdBy: 'system',
                createdAt: new Date().toISOString()
            };
            await ledgerRef.set(ledgerEntry);
        }

        // 6. Recalculate Fundry Pool
        if (projectId) {
            try {
                await recalculateFundryPool(projectId);
            } catch (poolErr: any) {
                console.error(`[webhook] Pool recalculation failed for project ${projectId}:`, poolErr);
                await adminDb.collection('webhook_delivery_failures').doc().set({
                    reason: 'pool_recalculation_failed',
                    projectId,
                    contributionId: contributionData.id,
                    error: poolErr.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 7. Mark event as processed to ensure idempotency
        await eventRef.set({
            processedAt: new Date().toISOString(),
            eventType: event.type,
            referenceId,
            squareOrderId
        });

        console.log(`[webhook] Contribution ${contributionData.id} updated to status ${updates.status || contributionData.status}`);
        return new Response('Success', { status: 200 });

    } catch (e: any) {
        console.error('[webhook] Square Webhook Error:', e);
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}
