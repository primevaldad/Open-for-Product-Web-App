
'use server';

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { UserLearningProgress } from '@/lib/types';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.ts');

const CompleteModuleSchema = z.object({
  userId: z.string(),
  pathId: z.string(),
  moduleId: z.string(),
  completed: z.boolean(),
});

function serializeLearningProgress(progress: UserLearningProgress[]): string {
    const progressStrings = progress.map(p => {
        const completedModulesString = p.completedModules.map(m => `'${m}'`).join(', ');
        return `    {
        userId: '${p.userId}',
        pathId: '${p.pathId}',
        completedModules: [${completedModulesString}],
    }`;
    }).join(',\n');

    return `export let currentUserLearningProgress: UserLearningProgress[] = [\n${progressStrings}\n];`;
}


async function updateDataFile(updater: (data: { progress: UserLearningProgress[] }) => { progress: UserLearningProgress[] }) {
  try {
    const dataFileModule = await import(`@/lib/data.ts?timestamp=${new Date().getTime()}`);
    const currentProgress: UserLearningProgress[] = dataFileModule.currentUserLearningProgress;

    const { progress: updatedProgress } = updater({ progress: currentProgress });
    
    const originalContent = await fs.readFile(dataFilePath, 'utf-8');
    
    const progressRegex = /export let currentUserLearningProgress: UserLearningProgress\[\] = \[[\s\S]*?\];/;
    const updatedContent = originalContent.replace(progressRegex, serializeLearningProgress(updatedProgress));
    
    await fs.writeFile(dataFilePath, updatedContent, 'utf-8');

  } catch (error) {
    console.error("Error updating data file:", error);
    throw new Error("Could not update learning progress.");
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

    try {
        await updateDataFile(({ progress }) => {
            let userProgress = progress.find(p => p.userId === userId && p.pathId === pathId);

            if (!userProgress) {
                userProgress = { userId, pathId, completedModules: [] };
                progress.push(userProgress);
            }

            const moduleIndex = userProgress.completedModules.indexOf(moduleId);

            if (completed && moduleIndex === -1) {
                userProgress.completedModules.push(moduleId);
            } else if (!completed && moduleIndex !== -1) {
                userProgress.completedModules.splice(moduleIndex, 1);
            }
            
            return { progress };
        });

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
