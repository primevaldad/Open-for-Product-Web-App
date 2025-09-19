
import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  findUserLearningProgress,
  getAllLearningPaths,
} from '@/lib/data.server';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module } from '@/lib/types';

const toISOString = (timestamp: any): string | any => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
        return timestamp.toISOString();
    }
    return timestamp;
};

// This is now a Server Component that fetches all necessary data
export default async function LearningModulePage({
  params,
}: {
  params: { id: string; moduleId: string };
}) {
  // getAuthenticatedUser will redirect if the user is not logged in.
  const rawCurrentUser = await getAuthenticatedUser();
  const learningPaths = await getAllLearningPaths();
  const rawPath = learningPaths.find((p) => p.id === params.id);

  // If the path doesn't exist, return a 404
  if (!rawPath) {
    notFound();
  }

  // Find the specific module within the path
  const module = rawPath.modules.find((m: Module) => m.id === params.moduleId) || null;

  // If the module doesn't exist in the path, return a 404
  if (!module) {
    notFound();
  }
  
  // --- SERIALIZATION ---
  const currentUser = {
    ...rawCurrentUser,
    createdAt: toISOString(rawCurrentUser.createdAt),
    lastLogin: toISOString(rawCurrentUser.lastLogin),
  };

  const path = {
      ...rawPath,
      createdAt: toISOString(rawPath.createdAt),
      updatedAt: toISOString(rawPath.updatedAt),
  };

  // Find the user's progress in this learning path
  // Note: userProgress might also need serialization if it contains timestamps.
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
