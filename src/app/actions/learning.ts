
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserLearningProgress, updateUserLearningProgress } from '@/lib/data.server'; // Corrected import

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

    let userProgress = await findUserLearningProgress(userId, pathId); // findUserLearningProgress is async

    if (!userProgress) {
        // This case handles enrolling a user in a path for the first time.
        userProgress = {
            userId,
            pathId,
            completedModules: completed ? [moduleId] : []
        };
    } else {
        const moduleIndex = userProgress.completedModules.indexOf(moduleId);
        if (completed && moduleIndex === -1) {
            userProgress.completedModules.push(moduleId);
        } else if (!completed && moduleIndex !== -1) {
            userProgress.completedModules.splice(moduleIndex, 1);
        }
    }

    await updateUserLearningProgress(userProgress); // updateUserLearningProgress is async

    // Revalidate all paths that display learning progress
    revalidatePath(`/learning/${pathId}/${moduleId}`);
    revalidatePath(`/learning/${pathId}`);
    revalidatePath('/activity');
    revalidatePath('/learning');

    return { success: true };
}
