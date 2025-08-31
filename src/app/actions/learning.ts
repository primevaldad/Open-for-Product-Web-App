
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase-admin';
import type { UserLearningProgress } from '@/lib/types';


const CompleteModuleSchema = z.object({
  userId: z.string(),
  pathId: z.string(),
  moduleId: z.string(),
  completed: z.boolean(),
});

export async function completeModule(values: z.infer<typeof CompleteModuleSchema>) {
    const validatedFields = CompleteModuleSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }

    const { userId, pathId, moduleId, completed } = validatedFields.data;

    try {
        const progressDocRef = db.collection('currentUserLearningProgress').doc(`${userId}-${pathId}`);
        const progressDoc = await progressDocRef.get();
        
        let userProgress: UserLearningProgress;

        if (!progressDoc.exists) {
            userProgress = { userId, pathId, completedModules: [] };
        } else {
            userProgress = progressDoc.data() as UserLearningProgress;
        }

        const moduleIndex = userProgress.completedModules.indexOf(moduleId);

        if (completed && moduleIndex === -1) {
            userProgress.completedModules.push(moduleId);
        } else if (!completed && moduleIndex !== -1) {
            userProgress.completedModules.splice(moduleIndex, 1);
        }
        
        await progressDocRef.set(userProgress, { merge: true });

        revalidatePath(`/learning/${pathId}/${moduleId}`);
        revalidatePath(`/learning/${pathId}`);
        revalidatePath('/activity');

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred."
        };
    }
}
