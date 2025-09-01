
import { notFound } from 'next/navigation';
import { getLearningModulePageData } from '@/lib/data-cache';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';

// This is now a Server Component that fetches all necessary data
export default async function LearningModulePage({ params }: { params: { id: string, moduleId: string } }) {
  
  const { path, module, userProgress, currentUser, prevModule, nextModule } = await getLearningModulePageData(params.id, params.moduleId);
  
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
