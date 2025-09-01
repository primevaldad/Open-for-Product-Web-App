
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        const progressDocRef = doc(db, 'currentUserLearningProgress', `${userId}-${pathId}`);
        const progressDoc = await getDoc(progressDocRef);
        
        if (!progressDoc.exists()) {
           if (completed) {
                await setDoc(progressDocRef, { userId, pathId, completedModules: [moduleId] });
           }
        } else {
            if (completed) {
                await updateDoc(progressDocRef, { completedModules: arrayUnion(moduleId) });
            } else {
                await updateDoc(progressDocRef, { completedModules: arrayRemove(moduleId) });
            }
        }

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
