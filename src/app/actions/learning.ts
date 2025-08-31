
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getHydratedData } from '@/lib/data-cache';
import { db } from '@/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';


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
        const data = await getHydratedData();
        let userProgress = data.currentUserLearningProgress.find(p => p.userId === userId && p.pathId === pathId);

        if (!userProgress) {
            userProgress = { userId, pathId, completedModules: [] };
        }

        const moduleIndex = userProgress.completedModules.indexOf(moduleId);

        if (completed && moduleIndex === -1) {
            userProgress.completedModules.push(moduleId);
        } else if (!completed && moduleIndex !== -1) {
            userProgress.completedModules.splice(moduleIndex, 1);
        }
        
        const progressDocRef = doc(db, 'currentUserLearningProgress', `${userId}-${pathId}`);
        await setDoc(progressDocRef, userProgress);

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
