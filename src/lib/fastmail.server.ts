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
            using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:submission'],
            methodCalls: [
                ['Identity/get', { accountId, ids: null }, 'i1']
            ]
        })
    });

    const identityData = await identityRes.json();
    const identities = identityData.methodResponses[0][1].list;
    const ofpIdentity = identities.find((id: any) => id.email === 'OfPProjects@openforproduct.com');

    if (!ofpIdentity) {
        console.warn('OfPProjects@openforproduct.com identity not found, using primary.');
    }

    const senderEmail = ofpIdentity ? ofpIdentity.email : identities[0].email;

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
                            emailId: '#draft'
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

    if (!sendRes.ok) {
        const err = await sendRes.text();
        throw new Error(`Failed to send email via JMAP: ${err}`);
    }

    return await sendRes.json();
}
