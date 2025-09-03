
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { mockUserLearningProgress } from '@/lib/mock-data';


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
    
    console.log("Updating mock learning progress (in-memory, will reset on server restart)");

    let userProgress = mockUserLearningProgress.find(p => p.userId === userId && p.pathId === pathId);

    if (!userProgress) {
        // This case handles enrolling a user in a path for the first time
        // when they visit a module page.
        mockUserLearningProgress.push({
            userId,
            pathId,
            completedModules: completed ? [moduleId] : []
        });
    } else {
        const moduleIndex = userProgress.completedModules.indexOf(moduleId);
        if (completed && moduleIndex === -1) {
            userProgress.completedModules.push(moduleId);
        } else if (!completed && moduleIndex !== -1) {
            userProgress.completedModules.splice(moduleIndex, 1);
        }
    }

    // Revalidate all paths that display learning progress
    revalidatePath(`/learning/${pathId}/${moduleId}`);
    revalidatePath(`/learning/${pathId}`);
    revalidatePath('/activity');

    return { success: true };
}
