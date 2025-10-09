
import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  findUserLearningProgress,
  getAllLearningPaths,
} from '@/lib/data.server';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module, LearningPath, User } from '@/lib/types';
import type { RoutePageProps } from '@/types/next-page-helpers';
import { serializeTimestamp } from '@/lib/utils';

/**
 * Server Component for displaying a specific learning module.
 */
export default async function LearningModulePage({ params }: RoutePageProps<{ pathId: string; moduleId: string }>): Promise<JSX.Element> {
  const { pathId, moduleId } = params;
  
  if (!pathId || !moduleId) {
    notFound();
  }

  const rawCurrentUser = await getAuthenticatedUser();

  const learningPaths = await getAllLearningPaths();
  const path: LearningPath | undefined = learningPaths.find((p) => p.pathId === pathId);
  if (!path) notFound();

  const learningModule: Module | undefined = path.modules.find((m) => m.moduleId === moduleId);
  if (!learningModule) notFound();
  
  // --- SERIALIZATION ---
  const currentUser: User = {
    ...rawCurrentUser,
    createdAt: serializeTimestamp(rawCurrentUser.createdAt) ?? undefined,
    lastLogin: serializeTimestamp(rawCurrentUser.lastLogin) ?? undefined,
  };

  const userProgress = await findUserLearningProgress(currentUser.id, pathId);

  const currentModuleIndex = path.modules.findIndex(
    (m: Module) => m.moduleId === moduleId
  );

  const prevModule = currentModuleIndex > 0 ? path.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < path.modules.length - 1
    ? path.modules[currentModuleIndex + 1]
    : null;

  return (
    <LearningModuleClientPage
      path={path}
      learningModule={learningModule} // Correctly pass the renamed prop
      userProgress={userProgress}
      currentUser={currentUser}
      prevModule={prevModule}
      nextModule={nextModule}
      completeModule={completeModule}
    />
  );
}
