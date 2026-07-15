#!/bin/bash
rm -f cookies.txt

# 1. Get a token
echo "Getting token..."
TOKEN=$(node -e "
const crypto = require('crypto');
const token = 'testtoken' + Date.now();
console.log(token);
")

echo "Token: $TOKEN"

# 2. Emulate the backend updating the db (skip, just test if cookie is set)
# We can't update db without credentials, so route.ts will fail with access-denied.
# BUT wait! If route.ts fails with access-denied, it DOES NOT set the cookie!
