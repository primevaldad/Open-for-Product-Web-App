
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/data.server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'temp-migration-secret-9876') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("Starting user migration: adding 'createdAt' field...");
    const usersRef = adminDb.collection('users');
    // Firestore queries for "not equal" or "is null" can be tricky. 
    // A more reliable way to find missing fields is to just get all users and check in code.
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        const message = "No users found in the database.";
        console.log(message);
        return NextResponse.json({ message });
    }

    const batch = adminDb.batch();
    let usersToUpdateCount = 0;
    const now = new Date().toISOString();

    for (const doc of snapshot.docs) {
        const user = doc.data();
        if (!user.createdAt) {
            usersToUpdateCount++;
            console.log(`User ${doc.id} (Name: ${user.name || 'N/A'}) is missing 'createdAt'. Scheduling for update.`);
            batch.update(doc.ref, { createdAt: now });
        }
    }

    if (usersToUpdateCount === 0) {
        const message = "All users already have the 'createdAt' field. No migration needed.";
        console.log(message);
        return NextResponse.json({ message });
    }

    console.log(`Found ${usersToUpdateCount} users to update. Committing changes...`);
    await batch.commit();
    const message = `Successfully updated ${usersToUpdateCount} users.`;
    console.log(message);

    return NextResponse.json({ message });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('An error occurred during user migration:', error);
    return NextResponse.json({ error: `Migration failed: ${errorMessage}` }, { status: 500 });
  }
}
