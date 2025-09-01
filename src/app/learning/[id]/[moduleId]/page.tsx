
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/data-cache';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module, LearningPath, UserLearningProgress } from '@/lib/types';
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';
import { mockLearningPaths, mockUserLearningProgress } from '@/lib/mock-data';


function getLearningModulePageData(pathId: string, moduleId: string) {
    const currentUser = getCurrentUser();
    
    const path = mockLearningPaths.find(p => p.id === pathId);

    if (!path || !currentUser) {
        return { path: null, module: null, userProgress: undefined, currentUser, prevModule: null, nextModule: null };
    }

    const { Icon, ...serializablePath } = { ...path, Icon: iconMap[path.category as keyof typeof iconMap] || FlaskConical };
    const module = serializablePath.modules.find((m: Module) => m.id === moduleId) || null;

    const userProgress = mockUserLearningProgress.find(p => p.userId === currentUser.id && p.pathId === pathId);
    
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
