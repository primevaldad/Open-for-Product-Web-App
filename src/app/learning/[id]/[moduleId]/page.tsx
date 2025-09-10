
import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  findUserLearningProgress,
  getAllLearningPaths,
} from '@/lib/data.server';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module } from '@/lib/types';

// This is now a Server Component that fetches all necessary data
export default async function LearningModulePage({
  params,
}: {
  params: { id: string; moduleId: string };
}) {
  // getAuthenticatedUser will redirect if the user is not logged in.
  const currentUser = await getAuthenticatedUser();
  const learningPaths = await getAllLearningPaths();
  const path = learningPaths.find((p) => p.id === params.id);

  // If the path doesn't exist, return a 404
  if (!path) {
    notFound();
  }

  // Find the specific module within the path
  const module = path.modules.find((m: Module) => m.id === params.moduleId) || null;

  // If the module doesn't exist in the path, return a 404
  if (!module) {
    notFound();
  }

  // Find the user's progress in this learning path
  const userProgress = await findUserLearningProgress(currentUser.id, params.id);

  // Determine the previous and next modules for navigation
  const currentModuleIndex = path.modules.findIndex(
    (m: Module) => m.id === params.moduleId
  );
  const prevModule =
    currentModuleIndex > 0 ? path.modules[currentModuleIndex - 1] : null;
  const nextModule =
    currentModuleIndex < path.modules.length - 1
      ? path.modules[currentModuleIndex + 1]
      : null;

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
