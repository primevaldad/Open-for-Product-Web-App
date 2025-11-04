
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { findUserLearningProgress, updateUserLearningProgress, getAllLearningPaths as getAllLearningPathsFromDb } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils.server';
import { UserLearningProgress, LearningPath } from '@/lib/types';

const CompleteModuleSchema = z.object({
  userId: z.string(),
  pathId: z.string(),
  moduleId: z.string(),
  completed: z.boolean(),
});

export type LearningPathsActionResponse = 
    | { success: true; paths: LearningPath[]; lastVisible: any; }
    | { success: false; error: string; };

export async function getLearningPathsAction(limit: number, startAfter: any = null): Promise<LearningPathsActionResponse> {
    try {
        const { paths, lastVisible } = await getAllLearningPathsFromDb(limit, startAfter);
        return deepSerialize({ success: true, paths, lastVisible }) as LearningPathsActionResponse;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return deepSerialize({ success: false, error: `Failed to fetch learning paths: ${errorMessage}` }) as LearningPathsActionResponse;
    }
}

export async function completeModule(values: z.infer<typeof CompleteModuleSchema>) {
    const validatedFields = CompleteModuleSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Invalid data provided.',
        };
    }

    const { userId, pathId, moduleId, completed } = validatedFields.data;

    let userProgress = await findUserLearningProgress(userId, pathId);

    if (!userProgress) {
        userProgress = {
            userId,
            pathId,
            completedModules: completed ? [moduleId] : [],
            lastAccessed: new Date().toISOString(),
        } as UserLearningProgress;
    } else {
        const moduleIndex = userProgress.completedModules.indexOf(moduleId);
        if (completed && moduleIndex === -1) {
            userProgress.completedModules.push(moduleId);
        } else if (!completed && moduleIndex !== -1) {
            userProgress.completedModules.splice(moduleIndex, 1);
        }
        userProgress.lastAccessed = new Date().toISOString();
    }

    await updateUserLearningProgress(userProgress);

    revalidatePath(`/learning/${pathId}/${moduleId}`);
    revalidatePath(`/learning/${pathId}`);
    revalidatePath('/activity');
    revalidatePath('/learning');

    return { success: true };
}
