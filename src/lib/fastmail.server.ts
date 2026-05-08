import 'server-only';

/**
 * Fastmail JMAP API utility for sending project invitations.
 */

const JMAP_SESSION_URL = 'https://api.fastmail.com/jmap/session';

async function getFastmailToken() {
    const token = process.env.FASTMAIL_API_TOKEN;
    if (!token) {
        throw new Error('FASTMAIL_API_TOKEN is not defined in environment variables');
    }
    return token;
}

export async function sendFastmailEmail(
    to: string,
    subject: string,
    htmlBody: string,
    fromName: string = 'Open for Product'
) {
    const token = await getFastmailToken();

    // 1. Get Session to find accountId and API URLs
    const sessionRes = await fetch(JMAP_SESSION_URL, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!sessionRes.ok) {
        throw new Error(`Failed to get Fastmail session: ${sessionRes.statusText}`);
    }

    const session = await sessionRes.json();
    const accountId = session.primaryAccounts['urn:ietf:params:jmap:mail'];
    const apiUrl = session.apiUrl;

    // 2. Get the identity for the sender (OfPProjects@openforproduct.com)
    // We assume the token has access to this identity.
    const identityRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission'],
            methodCalls: [
                ['Identity/get', { accountId, ids: null }, 'i1'],
                ['Mailbox/get', { accountId, ids: null }, 'm1']
            ]
        })
    });

    const identityData = await identityRes.json();
    
    if (!identityData.methodResponses || !identityData.methodResponses[0] || !identityData.methodResponses[1]) {
        throw new Error('Malformed response from Fastmail JMAP API');
    }

    const identities = identityData.methodResponses[0][1].list || [];
    const mailboxes = identityData.methodResponses[1][1].list || [];

    if (identities.length === 0) {
        throw new Error('No identities found for this Fastmail account');
    }

    // Find a suitable mailbox (Drafts or Sent)
    const draftsMailbox = mailboxes.find((m: any) => m.role === 'drafts' || m.name.toLowerCase() === 'drafts');
    const sentMailbox = mailboxes.find((m: any) => m.role === 'sent' || m.name.toLowerCase() === 'sent');
    const fallbackMailbox = mailboxes[0];
    
    const targetMailboxId = (draftsMailbox || sentMailbox || fallbackMailbox).id;

    const ofpIdentity = identities.find((id: any) => id.email.toLowerCase() === 'ofpprojects@openforproduct.com');

    if (!ofpIdentity) {
        console.warn(`OfPProjects@openforproduct.com identity not found. Available identities: ${identities.map((i: any) => i.email).join(', ')}`);
    }

    const senderEmail = ofpIdentity ? ofpIdentity.email : identities[0].email;
    const senderIdentityId = ofpIdentity ? ofpIdentity.id : identities[0].id;

    // 3. Send the email using Email/set (create) and EmailSubmission/set
    const sendRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            using: [
                'urn:ietf:params:jmap:core',
                'urn:ietf:params:jmap:mail',
                'urn:ietf:params:jmap:submission'
            ],
            methodCalls: [
                ['Email/set', {
                    accountId,
                    create: {
                        'draft': {
                            from: [{ name: fromName, email: senderEmail }],
                            to: [{ email: to }],
                            subject: subject,
                            mailboxIds: { [targetMailboxId]: true },
                            htmlBody: [{
                                partId: 'body',
                                type: 'text/html'
                            }],
                            bodyValues: {
                                'body': {
                                    value: htmlBody,
                                    isTruncated: false
                                }
                            }
                        }
                    }
                }, 'a'],
                ['EmailSubmission/set', {
                    accountId,
                    create: {
                        'send': {
                            emailId: '#draft',
                            identityId: senderIdentityId
                        }
                    },
                    onSuccessUpdateEmail: {
                        '#send': {
                            'keywords/$draft': null,
                            'keywords/$seen': true
                        }
                    }
                }, 'b']
            ]
        })
    });

    const result = await sendRes.json();

    // Check for method-level errors
    const errors = result.methodResponses.filter((r: any) => r[0] === 'error');
    if (errors.length > 0) {
        const errorDetail = JSON.stringify(errors[0][1]);
        console.error('[FASTMAIL_ERROR]', errorDetail);
        throw new Error(`Fastmail JMAP error: ${errors[0][1].type} - ${errorDetail}`);
    }

    // Check for specific creation errors in method responses
    // methodResponses[0] is Email/set, methodResponses[1] is EmailSubmission/set
    const emailSetResponse = result.methodResponses.find((r: any) => r[2] === 'a');
    const submissionSetResponse = result.methodResponses.find((r: any) => r[2] === 'b');

    if (emailSetResponse && emailSetResponse[1].notCreated && Object.keys(emailSetResponse[1].notCreated).length > 0) {
        const error = JSON.stringify(emailSetResponse[1].notCreated);
        console.error('[FASTMAIL_EMAIL_CREATE_FAILED]', error);
        throw new Error(`Failed to create email draft: ${error}`);
    }

    if (submissionSetResponse && submissionSetResponse[1].notCreated && Object.keys(submissionSetResponse[1].notCreated).length > 0) {
        const error = JSON.stringify(submissionSetResponse[1].notCreated);
        console.error('[FASTMAIL_SUBMISSION_FAILED]', error);
        throw new Error(`Failed to submit email for sending: ${error}`);
    }

    return result;
}
