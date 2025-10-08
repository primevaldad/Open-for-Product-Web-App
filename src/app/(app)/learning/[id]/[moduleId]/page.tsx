
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

/**
 * Converts Firestore timestamps or Date objects to ISO strings.
 */
const toISOString = (timestamp: any): string | null => {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  return timestamp.toString(); // Fallback for already serialized data
};

/**
 * Server Component for displaying a specific learning module.
 */
export default async function LearningModulePage({ params }: RoutePageProps<{ pathId: string; moduleId: string }>): Promise<JSX.Element> {
  const { pathId, moduleId } = params;
  
  // getAuthenticatedUser will redirect if the user is not logged in
  const rawCurrentUser = await getAuthenticatedUser();

  const learningPaths = await getAllLearningPaths();
  const path: LearningPath | undefined = learningPaths.find((p) => p.pathId === pathId);
  if (!path) notFound();



  if (!path) notFound();

  const module: Module | undefined = path.modules.find((m) => m.moduleId === moduleId);
  if (!module) notFound();

  if (!module) notFound();
  
  // --- SERIALIZATION ---
  const currentUser: User = {
    ...rawCurrentUser,
    createdAt: toISOString(rawCurrentUser.createdAt) ?? undefined,
    lastLogin: toISOString(rawCurrentUser.lastLogin) ?? undefined,
  };

  // User progress
  const userProgress = await findUserLearningProgress(currentUser.id, pathId);

  // Previous and next modules for navigation
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
      module={module}
      userProgress={userProgress}
      currentUser={currentUser}
      prevModule={prevModule}
      nextModule={nextModule}
      completeModule={completeModule}
    />
  );
}
