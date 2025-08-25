
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data-cache';
import type { LearningPath, User, UserLearningProgress } from '@/lib/types';
import LearningModuleClientPage from './learning-module-client-page';

// This is now a Server Component that fetches all necessary data
export default async function LearningModulePage({ params }: { params: { id: string, moduleId: string } }) {
  const { learningPaths, currentUser, currentUserLearningProgress } = await getData();
  
  const pathId = params.id;
  const moduleId = params.moduleId;

  const path = learningPaths.find((p) => p.id === pathId);
  const module = path?.modules.find((m) => m.id === moduleId);

  if (!path || !module) {
    notFound();
  }

  const userProgress = (currentUserLearningProgress || []).find(p => p.userId === currentUser.id && p.pathId === pathId);
  
  const currentModuleIndex = path.modules.findIndex(m => m.id === module.id);
  const prevModule = currentModuleIndex > 0 ? path.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < path.modules.length - 1 ? path.modules[currentModuleIndex + 1] : null;

  return (
    <LearningModuleClientPage
        path={path}
        module={module}
        userProgress={userProgress}
        currentUser={currentUser}
        prevModule={prevModule}
        nextModule={nextModule}
    />
  );
}
