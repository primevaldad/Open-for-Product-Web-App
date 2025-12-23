
'use server';

// This is a server-side only utility for proxying requests.
// It's not intended to be a public-facing API route.

import type { NextApiRequest, NextApiResponse } from 'next';

export async function proxyRequest(req: NextApiRequest, res: NextApiResponse, targetUrl: string) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }
        
        return res.status(200).json(data);
    } catch (error) {
        console.error('Proxy request failed:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
