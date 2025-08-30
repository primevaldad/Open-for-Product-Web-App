
// Use with `npx tsx src/lib/seed.ts`
import 'dotenv/config';
import { db } from './firebase';
import { collection, writeBatch, getDocs, doc, deleteDoc } from 'firebase/firestore';

// This file is now empty as raw data has been removed.
// It can be used later to create a new, correct seeding script if needed.
console.log("This seed script is currently disabled.");
