const { parse } = require('cookie');
const encoded = Buffer.from(JSON.stringify({ grants: { "test-123": { expiresAt: Date.now() + 100000 } } })).toString('base64url');
console.log(encoded);
