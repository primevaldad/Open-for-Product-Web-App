
// Use with `npx tsx src/lib/seed.ts`
import 'dotenv/config';
import { db } from './firebase';
import { collection, writeBatch, getDocs, doc, deleteDoc } from 'firebase/firestore';
import {
  rawUsers,
  rawProjects,
  rawTasks,
  rawLearningPaths,
  rawProgress,
  rawInterests,
} from './raw-data';

async function clearCollection(collectionName: string) {
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is already empty.`);
    return;
  }
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Collection ${collectionName} cleared.`);
}


async function seedDatabase() {
  try {
    console.log('Clearing existing data...');
    await Promise.all([
        clearCollection('users'),
        clearCollection('projects'),
        clearCollection('tasks'),
        clearCollection('learningPaths'),
        clearCollection('currentUserLearningProgress'),
        clearCollection('interests'),
    ]);
    console.log('All collections cleared.');

    console.log('Starting to seed data...');
    const batch = writeBatch(db);

    // Seed Users
    rawUsers.forEach(user => {
      const docRef = doc(db, 'users', user.id);
      batch.set(docRef, user);
    });
    console.log('Users prepared for batch.');

    // Seed Projects
    rawProjects.forEach(project => {
      const docRef = doc(db, 'projects', project.id);
       const plainProject = {
        ...project,
        team: project.team.map(m => ({ userId: m.user, role: m.role })),
        discussions: (project.discussions || []).map(d => {
            const { id, user, content, timestamp } = d;
            return { id, userId: user, content, timestamp };
        }),
      };
      batch.set(docRef, plainProject);
    });
    console.log('Projects prepared for batch.');

    // Seed Tasks
    rawTasks.forEach(task => {
        const { assignedTo, ...rest } = task;
        const plainTask: any = rest;
        if (assignedTo) {
            plainTask.assignedToId = assignedTo;
        }
      const docRef = doc(db, 'tasks', task.id);
      batch.set(docRef, plainTask);
    });
    console.log('Tasks prepared for batch.');

    // Seed Learning Paths
    rawLearningPaths.forEach(lp => {
      const docRef = doc(db, 'learningPaths', lp.id);
      batch.set(docRef, lp);
    });
    console.log('Learning Paths prepared for batch.');

    // Seed Progress
    rawProgress.forEach(progress => {
      const docId = `${progress.userId}-${progress.pathId}`;
      const docRef = doc(db, 'currentUserLearningProgress', docId);
      batch.set(docRef, progress);
    });
    console.log('Progress prepared for batch.');
    
    // Seed Interests
    rawInterests.forEach(interest => {
        const docRef = doc(db, 'interests', interest.id);
        batch.set(docRef, interest);
    });
    console.log('Interests prepared for batch.');


    await batch.commit();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
