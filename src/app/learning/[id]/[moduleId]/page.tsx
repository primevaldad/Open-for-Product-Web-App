
import { notFound } from 'next/navigation';
import { getCurrentUser, findUserLearningProgress, getAllLearningPaths, findUserById } from '@/lib/data-cache';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module } from '@/lib/types';
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';

function getLearningModulePageData(pathId: string, moduleId: string) {
    const currentUser = getCurrentUser();
    const learningPaths = getAllLearningPaths();
    const pathData = learningPaths.find(p => p.id === pathId);

    if (!pathData || !currentUser) {
        return { path: null, module: null, userProgress: undefined, currentUser, prevModule: null, nextModule: null };
    }

    const serializablePath = {
        ...pathData,
        Icon: iconMap[pathData.category as keyof typeof iconMap] || FlaskConical,
    };
    
    const module = serializablePath.modules.find((m: Module) => m.id === moduleId) || null;

    const userProgress = findUserLearningProgress(currentUser.id, pathId);

    const currentModuleIndex = serializablePath.modules.findIndex((m: Module) => m.id === moduleId);
    const prevModule = currentModuleIndex > 0 ? serializablePath.modules[currentModuleIndex - 1] : null;
    const nextModule = currentModuleIndex < serializablePath.modules.length - 1 ? serializablePath.modules[currentModuleIndex + 1] : null;

    return { path: serializablePath, module, userProgress, currentUser, prevModule, nextModule };
}


// This is now a Server Component that fetches all necessary data
export default function LearningModulePage({ params }: { params: { id: string, moduleId: string } }) {

  const { path, module, userProgress, currentUser, prevModule, nextModule } = getLearningModulePageData(params.id, params.moduleId);

  if (!path || !module || !currentUser) {
    notFound();
  }

  return (
    <LearningModuleClientPage
        path={path}
        module={module}
        userProgress={userProgress}
        currentUser={currentUser}
        prevModule={prevModule}
        nextModule={nextModule}
        completeModule={completeModule}
    />
  );
}
