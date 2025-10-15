
import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  findUserLearningProgress,
  getAllLearningPaths,
} from '@/lib/data.server';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module, User } from '@/lib/types';
import type { RoutePageProps } from '@/types/next-page-helpers';

/**
 * Converts Firestore timestamps or Date objects to ISO strings.
 */
const toISOString = (timestamp: unknown): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: unknown }).toDate === 'function'
  ) {
    return ((timestamp as { toDate: () => Date }).toDate()).toISOString();
  }
  return timestamp.toString();
};

/**
 * Server Component for displaying a specific learning module.
 */
export default async function LearningModulePage({ params }: RoutePageProps<{ id: string; moduleId: string }>) {
  const { id, moduleId } = params;
  
  // getAuthenticatedUser will redirect if the user is not logged in
  const rawCurrentUser = await getAuthenticatedUser();

  const learningPaths = await getAllLearningPaths();
  const path = learningPaths.find((p) => p.pathId === id);

  if (!path) notFound();

  const module = path.modules.find((m) => m.moduleId === moduleId);

  if (!module) notFound();
  
  // --- SERIALIZATION ---
  const currentUser: User = {
    ...rawCurrentUser,
    createdAt: toISOString(rawCurrentUser.createdAt) ?? undefined,
    lastLogin: toISOString(rawCurrentUser.lastLogin) ?? undefined,
  };

  // User progress
  const userProgress = await findUserLearningProgress(currentUser.id, id);

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
